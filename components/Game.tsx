import { useRouter } from 'next/router'
import { memo, useEffect, useMemo, useState } from 'react'
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
  const [saveValue, setSaveValue] = useState<SaveValue>({ bestScores: {} })
  const [level, setLevel] = useState<Level>()
  const clearedLevel = saveValue.clearedLevel

  useEffect(() => setSaveValue(loadState()), [])

  const onCleared = (result: Result) => {
    if (!level) return

    if (!clearedLevel || level > clearedLevel) {
      saveValue.clearedLevel = level
    }

    const levelConfig = levelConfigs[level]
    const best = saveValue.bestScores[level]
    if (!best || calcScore(levelConfig, best) < calcScore(levelConfig, result)) {
      saveValue.bestScores[level] = result
    }

    saveState(saveValue)
    setSaveValue(saveValue)
  }

  const onClearData = () => {
    if (confirm('データを削除しますか？')) {
      clearState()
      setSaveValue({ bestScores: {} })
    }
  }

  const onReturn = () => setLevel(undefined)

  return <div className={props.classname}>
    <div className='absolute w-screen h-screen select-none'>
      {level
        ? <GameCore level={level} images={props.images} onReturnToTitle={onReturn} onCleared={onCleared} />
        : <div className='w-full h-full'>
          <SelectLevel clearedLevel={clearedLevel} bestScores={saveValue.bestScores} onLevelSelected={level => setLevel(level)} />
          <button className='absolute top-0 right-0 bg-white rounded-md text-sm' onClick={onClearData}>データクリア</button>
        </div>}
    </div>
  </div>
}

type Level = 1 | 285 | 28285

type BestScore = {
  time: number
  moveCount: number
}

type BestScores = { [level in Level]?: BestScore }

type SaveValue = {
  clearedLevel?: Level
  bestScores: BestScores
}

const SAVE_KEY = 'SAVE'

const loadState = () => {
  const json = typeof window === 'undefined' ? null : localStorage.getItem(SAVE_KEY)
  const value: SaveValue = json ? JSON.parse(json) : {
    bestScores: {}
  }
  return value
}

const saveState = (value: SaveValue) => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(value))
}

const clearState = () => localStorage.removeItem(SAVE_KEY)

type LevelConfig = {
  className: string
  columns: number
  rows: number
  standardMoveCount: number
  standardTime: number
  spinDown: string
}

const levelConfigs: { [level in Level]: LevelConfig } = {
  1: {
    className: 'grid-cols-4',
    columns: 4,
    rows: 2,
    standardMoveCount: 6,
    standardTime: 10,
    spinDown: '🐣',
  },
  285: {
    className: 'grid-cols-6',
    columns: 6,
    rows: 3,
    standardMoveCount: 18,
    standardTime: 45,
    spinDown: '🐔',
  },
  28285: {
    className: 'grid-cols-8',
    columns: 8,
    rows: 4,
    standardMoveCount: 48,
    standardTime: 60,
    spinDown: '🍗',
  },
}

const calcScore = (levelConfig: LevelConfig, best: { time: number, moveCount: number }) =>
  Math.floor(
    (100 - (best.moveCount - levelConfig.standardMoveCount) - (best.time / 1000 - levelConfig.standardTime))
    * 1000
  ) / 1000

const timeToString = (time: number) => {
  const minutes = Math.floor(time / 1000 / 60)
  const seconds = Math.floor(time / 1000)
  const millisecond = time % 1000
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millisecond.toString().padStart(3, '0')}`
}

type SelectLevelProps = {
  clearedLevel?: Level
  bestScores: BestScores
  onLevelSelected: (level: Level) => void
}

const SelectLevel = (props: SelectLevelProps) => {
  const isLevel28285 = (props.clearedLevel ?? 0) >= 285

  return <div className='w-full h-full flex flex-col text-center justify-center'>
    <div className='text-sm'>登録者1万人到達おめチキ記念</div>
    <div className='m-4 text-6xl text-red-500 font-bold'>神鶏衰弱</div>
    <div className='m-2 text-2xl text-gray-800'>🐓難易度を選択してね🐓</div>

    <button
      className='m-2 p-2 rounded-md bg-cyan-200 hover:bg-cyan-300'
      onClick={() => props.onLevelSelected(1)}
    >
      🐣 レベル 1 🐣{props.bestScores[1] && <BestScoreView levelConfig={levelConfigs[1]} best={props.bestScores[1]} />}
    </button>
    <button
      className='m-2 p-2 rounded-md bg-red-300 hover:bg-red-400'
      onClick={() => props.onLevelSelected(285)}
    >
      🐔 レベル 285 🐔{props.bestScores[285] && <BestScoreView levelConfig={levelConfigs[285]} best={props.bestScores[285]} />}
    </button>
    <button
      className={`m-2 p-2 rounded-md text-white ${isLevel28285 ? 'bg-pink-600 hover:bg-pink-700' : 'bg-gray-500 cursor-not-allowed'}`}
      disabled={!isLevel28285}
      onClick={() => props.onLevelSelected(28285)}
    >
      {isLevel28285 ? '🍗 タベル 28285 🍗' : '🔒 レベル 285 クリアで解放 🔒'}{props.bestScores[28285] && <BestScoreView levelConfig={levelConfigs[28285]} best={props.bestScores[28285]} />}
    </button>

    <div className='absolute bottom-0 right-0'>
      <a href="https://twitter.com/sunagimosoft" className='text-blue-500 hover:underline'>@sunagimosoft</a>
    </div>
  </div>
}

const BestScoreView = (props: { levelConfig: LevelConfig, best: BestScore }) => {
  return <span className='pl-1 text-base'>| {calcScore(props.levelConfig, props.best)} {timeToString(props.best.time)} {props.best.moveCount}手</span>
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

const getCards = (images: string[], levelConfig: LevelConfig, basePath: string) => {
  const remainImages = [...images]
  const singles = Array.from({ length: (levelConfig.columns * levelConfig.rows) / 2 }).map(() => {
    const index = Math.floor(Math.random() * remainImages.length)
    return remainImages.splice(index, 1)[0]
  })

  const pairs = fisherYatesShuffle([...singles, ...singles])
  return pairs.map((image): CardProps => ({
    basePath,
    frontImage: image,
    isFront: false,
    isSelectable: false,
    state: 'normal',
    isLoaded: false,
  }))
}

type GameState = 'init' | 'loading' | 'loaded' | 'count-down' | 'select1' | 'select2' | 'selected' | 'failed' | 'result'

type Result = {
  moveCount: number
  time: number
}

const GameCore = (props: { level: Level, images: LevelImages, onReturnToTitle: () => void, onCleared: (result: Result) => void }) => {
  const levelConfig = levelConfigs[props.level]
  const router = useRouter()
  const [state, setState] = useState<GameState>('init')
  const [cards, setCards] = useState<CardProps[]>(() => getCards(props.images[props.level], levelConfig, router.basePath))
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
        setState('loading')
        break
      case 'loading':
        break
      case 'loaded':
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
        const newResult: Result = {
          time: end - (startedAt ?? 0),
          moveCount: moveCount,
        }
        setResult(newResult)
        props.onCleared(newResult)
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

  const onCardLoaded = (card: CardProps) => {
    console.log('loaded', card)
    card.isLoaded = true
    setCards([...cards])
    if (cards.every(c => c.isLoaded)) {
      setState('loaded')
    }
  }

  const randomSpinDownDivs = useMemo(
    () =>
      Array.from({ length: 28 })
        .map((_, i) => <div key={i} className='absolute h-min w-min -top-1/4' style={{
          animation: `spindown ${Math.random() * 3 + 2}s linear infinite ${Math.random() * 5}s`,
          left: `${Math.random() * 100}%`,
        }}>{levelConfig.spinDown}</div>),
    [props.level]
  )

  return <>
    <div className='absolute left-0 top-0 right-0 bottom-0 p-2 pt-9 overflow-hidden'>
      <div className={`grid ${levelConfigs[props.level].className} gap-2 w-full h-full`}>
        {cards.map((card, index) => <Card key={index} {...card} onClick={() => onCardClicked(card)} onLoad={() => onCardLoaded(card)} />)}
      </div>
    </div>

    {state === 'loading' && <div className='absolute flex flex-col w-full h-full text-5xl text-center justify-center'>
      <div className='text-white bg-rose-300 p-8 bg-opacity-80'>ロード中...</div>
    </div>}

    {countDown && <div className='absolute flex flex-col w-full h-full text-9xl text-center justify-center'>
      <div className='text-white bg-rose-300 p-8 bg-opacity-80'>{countDown}</div>
    </div>}

    <div className='absolute top-0 pt-1 w-full flex flex-row'>
      <div className='flex-grow ml-2'>{getMessage(state)}</div>
      <div className='mr-2'>レベル: {props.level}</div>
      <div className='mr-2'>手数: {moveCount}</div>
      <div className='mr-2'>
        <span>タイム:</span>
        <Time startedAt={startedAt} endedAt={endedAt} className='ml-1' />
      </div>
    </div>

    {result && <div className='absolute w-full h-full text-5xl overflow-hidden'>{randomSpinDownDivs}</div>}

    {result && <div className='absolute flex flex-col w-full h-full text-center justify-center'>
      <div className='self-center p-2 bg-red-200 bg-opacity-95'>
        <div className='p-1'>{timeToString(result.time)}</div>
        <div className='p-1'>手数 {result.moveCount}</div>
        <div className='p-1'>スコア {calcScore(levelConfig, result)}</div>
        <button className='p-1 mt-1 rounded-md bg-white' onClick={props.onReturnToTitle}>タイトルに戻る</button>
      </div>
    </div>}
  </>
}

const getMessage = (state: GameState) => {
  switch (state) {
    case 'init': return '初期化中...'
    case 'loading': return 'ロード中...'
    case 'loaded': return ''
    case 'count-down': return ''
    case 'select1': return 'カードを選んでね👇'
    case 'select2': return '一致するカードを選んでね👇'
    case 'selected': return ''
    case 'failed': return '残念！タップして次へ'
    case 'result': return '終わり🎉'
    default:
      const n: never = state
      return `state: ${state}`
  }
}


type CardProps = {
  basePath: string
  frontImage?: string
  isFront: boolean
  isSelectable: boolean
  state: 'normal' | 'duty' | 'cleared'
  isLoaded: boolean
  onClick?: () => void
  onLoad?: () => void
}

const Card = memo(function Card(props: CardProps) {
  return (
    <button
      className='relative select-none perspective-1000'
      onClick={props.onClick}
      disabled={!props.isSelectable}
    >
      <div className={`relative w-full h-full text-center transition transform-3d ${props.isFront ? '' : 'rotate-y-180'}`}>
        <div className={`absolute w-full h-full rounded-md border-4 bg-cyan-200 blur-md backface-hidden ${props.state === 'duty' ? 'visible' : 'hidden'}`} />
        <div className={`absolute w-full h-full break-words overflow-hidden rounded-md border-4 ${props.isSelectable ? 'border-white hover:border-cyan-300' : 'border-gray-400'} bg-orange-100 backface-hidden`}>
          {props.frontImage && <img onLoad={props.onLoad} src={`${props.basePath}${props.frontImage}`} className='absolute w-full h-full object-cover pointer-events-none' />}
        </div>
        <div className={`absolute w-full h-full break-words overflow-hidden rounded-md border-4 ${props.isSelectable ? 'border-white hover:border-cyan-300' : 'border-gray-400'} bg-red-200 backface-hidden rotate-y-180`}>
          <img src={`${props.basePath}/assets/card-back.jpg`} className='w-full h-full object-cover pointer-events-none' />
          {props.isLoaded && <div className='absolute top-0'>LOADED!</div>}
        </div>
      </div>

    </button>
  )
})
