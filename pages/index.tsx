import type { GetStaticProps, NextPage } from 'next'
import Head from 'next/head'
import { Game, LevelImages } from '../components/Game'
import { getLevelImages } from '../components/imageSources'

type Props = {
  images: LevelImages
}

const Home: NextPage<Props> = props => {
  return (
    <div className='text-gray-800 subpixel-antialiased text-xl'>
      <Head>
        <title>神鶏衰弱</title>
        <meta name="description" content="神鶏の神経衰弱" />
        <link rel="icon" href="/favicon.ico" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@sunagimosoft" />
        <meta name="twitter:creator" content="@sunagimosoft" />
        <meta property="og:url" content="https://sunagimosoft.github.io/shinkei-suijaku/" />
        <meta property="og:title" content="神鶏衰弱" />
        <meta property="og:description" content="神鶏の神経衰弱" />
        <meta property="og:image" content="https://sunagimosoft.github.io/shinkei-suijaku/card.jpg" />

        <script async src="https://www.googletagmanager.com/gtag/js?id=G-H9L9HLXKD6"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-H9L9HLXKD6');
          ` }}
        />
      </Head>

      <Game classname='h-screen w-screen' images={props.images} />
    </div>
  )
}

export default Home

export const getStaticProps: GetStaticProps<Props> = async () => {
  return {
    props: {
      images: {
        1: await getLevelImages('./public/assets/level1', '/assets/level1'),
        285: await getLevelImages('./public/assets/level285', '/assets/level285'),
        28285: await getLevelImages('./public/assets/level28285', '/assets/level28285'),
      }
    }
  }
}