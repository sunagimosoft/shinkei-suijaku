import gsap from 'gsap'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useSound } from 'use-sound'
import cardFlipSound from '../public/assets/sounds/card-flip.aac'
import nanSound from '../public/assets/sounds/nan.aac'
import okkeiSound from '../public/assets/sounds/okkei.aac'

export type LevelImages = {
  1: string[]
  285: string[]
  28285: string[]
}

export const Game = (props: { classname: string, images: LevelImages }) => {
  const [level, setLevel] = useState<Level>()
  const [clearedLevel, setClearedLevel] = useState<Level>()

  const onCleared = () => {
    setClearedLevel(level)
    setLevel(undefined)
  }

  return <div className={props.classname}>
    <div className='absolute w-screen h-screen select-none'>
      {level
        ? <GameCore level={level} images={props.images} onReturnToTitle={onCleared} />
        : <SelectLevel clearedLevel={clearedLevel} onLevelSelected={level => setLevel(level)} />}
    </div>
  </div>
}

type Level = 1 | 285 | 28285

const SelectLevel = (props: { onLevelSelected: (level: Level) => void, clearedLevel?: Level }) => {
  const isLevel28285 = (props.clearedLevel ?? 0) >= 285

  return <div className='w-full h-full flex flex-col text-center justify-center'>
    <div className='m-2 text-4xl text-red-500 font-bold'>神鶏衰弱</div>
    <div className='m-2 text-xl text-gray-800'>🐓難易度を選択してね🐓</div>

    <button
      className='m-2 p-2 rounded-md bg-cyan-200 hover:bg-cyan-300'
      onClick={() => props.onLevelSelected(1)}
    >
      🐣 レベル 1 🐣
    </button>
    <button
      className='m-2 p-2 rounded-md bg-red-300 hover:bg-red-400'
      onClick={() => props.onLevelSelected(285)}
    >
      🐔 レベル 285 🐔
    </button>
    <button
      className={`m-2 p-2 rounded-md text-white ${isLevel28285 ? 'bg-pink-600 hover:bg-pink-700' : 'bg-gray-500 cursor-not-allowed'}`}
      disabled={!isLevel28285}
      onClick={() => props.onLevelSelected(28285)}
    >
      {isLevel28285 ? '🍗 タベル 28285 🍗' : '🔒 レベル 285 クリアで解放 🔒'}
    </button>
  </div>
}

const Time = (props: { startedAt?: number, endedAt?: number, className: string }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (props.startedAt && !props.endedAt) {
      let id = 0
      const refresh = () => {
        setElapsed(Date.now() - (props.startedAt ?? 0))
        id = requestAnimationFrame(refresh)
      }
      refresh()
      return () => cancelAnimationFrame(id)
    } else if (props.startedAt && props.endedAt) {
      setElapsed(props.endedAt - props.startedAt)
    }
  }, [props.startedAt, props.endedAt])

  return <span className={props.className}>{props.startedAt ? (elapsed / 1000).toFixed(1) : ''}</span>
}

const fisherYatesShuffle = function <T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

const getCards = (images: string[], levelConfig: LevelConfig) => {
  const remainImages = [...images]
  const singles = Array.from({ length: (levelConfig.columns * levelConfig.rows) / 2 }).map(() => {
    const index = Math.floor(Math.random() * remainImages.length)
    return remainImages.splice(index, 1)[0]
  })

  const pairs = fisherYatesShuffle([...singles, ...singles])
  return pairs.map((image): CardProps => ({
    frontImage: image,
    isFront: false,
    isSelectable: false,
    state: 'normal',
  }))
}

type LevelConfig = {
  className: string
  columns: number
  rows: number
}

const levelConfigs: { [level in Level]: LevelConfig } = {
  1: {
    className: 'grid-cols-4',
    columns: 4,
    rows: 2,
  },
  285: {
    className: 'grid-cols-5',
    columns: 5,
    rows: 2,
  },
  28285: {
    className: 'grid-cols-8',
    columns: 8,
    rows: 3,
  },
}

type GameState = 'init' | 'count-down' | 'select1' | 'select2' | 'selected' | 'failed' | 'result'

type Result = {
  moveCount: number
  time: string
  score: number
}

const GameCore = (props: { level: Level, images: LevelImages, onReturnToTitle: () => void }) => {
  const [state, setState] = useState<GameState>('init')
  const [cards, setCards] = useState<CardProps[]>(() => getCards(props.images[props.level], levelConfigs[props.level]))
  const [countDown, setCountDown] = useState<number>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [startedAt, setStartedAt] = useState<number>()
  const [endedAt, setEndedAt] = useState<number>()
  const [moveCount, setMoveCount] = useState(0)
  const [result, setResult] = useState<Result>()
  const [playNan] = useSound(nanSound)
  const [playOkkei] = useSound(okkeiSound)
  const [playCardFlip] = useSound(cardFlipSound)

  useEffect(() => {
    switch (state) {
      case 'init':
        setCountDown(3)
        setState('count-down')
        break
      case 'count-down':
        setTimeout(() => {
          if (countDown && countDown > 1) {
            setCountDown(countDown - 1)
          } else {
            setCards(cards.map(c => ({ ...c, isSelectable: !c.isFront })))
            setCountDown(undefined)
            setStartedAt(Date.now())
            setIsPlaying(true)
            setState('select1')
          }
        }, 1000)
        break
      case 'selected':
        const dutyCards = cards.filter(c => c.state === 'duty')
        if (dutyCards.length === 2 && dutyCards[0].frontImage !== dutyCards[1].frontImage) {
          playNan()
          setCards(cards.map(c => c.state === 'duty' ? { ...c, isSelectable: true } : c))
          setState('failed')
        } else {
          playOkkei()
          setCards(cards.map(c => c.state === 'duty' ? { ...c, state: 'cleared' } : c))
          const isAllCleared = cards.every(c => c.state !== 'normal')
          if (isAllCleared) {
            setState('result')
          } else {
            setState('select1')
          }
        }
        break
      case 'result':
        const end = endedAt ?? Date.now()
        setEndedAt(end)
        setIsPlaying(false)
        const elapsed = new Date(end - (startedAt ?? 0))
        setResult({
          score: 100 - (moveCount - 4 * 2) - (elapsed.valueOf() / (1000 * 4) - 4),
          moveCount: moveCount,
          time: `${elapsed.getUTCHours()}:${elapsed.getUTCMinutes()}:${elapsed.getUTCSeconds()}.${elapsed.getUTCMilliseconds()}`
        })
        break
    }
  }, [state, countDown])

  const onCardClicked = (card: CardProps) => {
    switch (state) {
      case 'select1':
        setCards(cards.map(c => c === card ? { ...card, isFront: true, isSelectable: false, state: 'duty' } : c))
        playCardFlip()
        setState('select2')
        break
      case 'select2':
        setCards(cards.map(c => c === card ? { ...card, isFront: true, isSelectable: false, state: 'duty' } : c))
        playCardFlip()
        setMoveCount(moveCount + 1)
        setState('selected')
        break
      case 'failed':
        setCards(cards.map(c => c.state === 'duty' ? { ...c, isFront: false, isSelectable: true, state: 'normal' } : c))
        playCardFlip()
        setState('select1')
        break
    }
  }

  return <>
    <div className='absolute left-0 top-0 right-0 bottom-0 p-2 pt-6 overflow-hidden'>
      <div className={`grid ${levelConfigs[props.level].className} gap-2 w-full h-full`}>
        {cards.map((card, index) => <Card key={index} {...card} onClick={() => onCardClicked(card)} />)}
      </div>
    </div>

    {countDown && <div className='absolute flex flex-col w-full h-full text-9xl text-center justify-center'>
      <div className='text-white bg-rose-300 p-8 opacity-80'>{countDown}</div>
    </div>}

    {result && <div className='absolute flex flex-col w-full h-full text-sm text-center justify-center'>
      <div className='self-center p-2 bg-red-200'>
        <div className='p-1'>{result.time}</div>
        <div className='p-1'>手数 {result.moveCount}</div>
        <div className='p-1'>スコア {result.score}</div>
        <button className='p-1 mt-1 rounded-md bg-white' onClick={props.onReturnToTitle}>タイトルに戻る</button>
      </div>
    </div>}

    <div className='absolute top-0 pt-1 w-full h-4 text-xs flex flex-row'>
      <div className='flex-grow ml-2'>{getMessage(state)}</div>
      <div className='mr-2'>レベル: {props.level}</div>
      <div className='mr-2'>手数: {moveCount}</div>
      <div className='mr-2'>
        <span>タイム:</span>
        <Time startedAt={startedAt} endedAt={endedAt} className='ml-1' />
      </div>
    </div>
  </>
}

const getMessage = (state: GameState) => {
  switch (state) {
    case 'init': return '初期化中...'
    case 'count-down': return ''
    case 'select1': return 'カードを選んでね👇'
    case 'select2': return '一致するカードを選んでね👇'
    case 'selected': return ''
    case 'failed': return '残念！タップして次へ'
    case 'result': return '終わり🎉'
    default: return `state: ${state}`
  }
}


type CardProps = {
  frontImage?: string
  isFront: boolean
  isSelectable: boolean
  state: 'normal' | 'duty' | 'cleared'
  onClick?: () => void
}

const Card = (props: CardProps) => {
  return (
    <button
      className='relative select-none perspective-1000'
      onClick={props.onClick}
      disabled={!props.isSelectable}
    >
      <div className={`relative w-full h-full text-center transition transform-3d ${props.isFront ? '' : 'rotate-y-180'}`}>
        <div className={`absolute w-full h-full rounded-md border-4 bg-cyan-200 blur-md backface-hidden ${props.state === 'duty' ? 'visible' : 'hidden'}`} />
        <div className={`absolute w-full h-full break-words overflow-hidden rounded-md border-4 ${props.isSelectable ? 'border-white hover:border-cyan-300' : 'border-gray-400'} bg-cyan-100 backface-hidden`}>
          {props.frontImage && <Image src={props.frontImage} layout='fill' objectFit='cover' className='absolute pointer-events-none' />}
          {/* <div className='absolute break-all'>Front: {props.frontImage}</div> */}
        </div>
        <div className={`absolute w-full h-full break-words overflow-hidden rounded-md border-4 ${props.isSelectable ? 'border-white hover:border-cyan-300' : 'border-gray-400'} bg-red-200 backface-hidden rotate-y-180`}>
          {/* <Image src='/background.jpg' layout='fill' className='absolute pointer-events-none' /> */}
          {/* <div className='absolute break-all'>Back: {props.frontImage}</div> */}
        </div>
      </div>

    </button>
  )
}