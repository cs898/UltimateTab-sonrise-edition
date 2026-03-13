import { getSpotifyAccessToken } from './../api/spotify'
import {
  Tab,
  Pagination,
  ApiResponseTab,
  TabScrapped,
  UGChordCollection,
  ApiArgsSearch,
} from './../../types/tabs'
import { TAB_TYPES_VALUES } from '../../constants'
import { ApiResponseSearch } from '../../types/tabs'
import { getPuppeteerConf } from '../api/request'
import sanitizeHtml from 'sanitize-html'

export function validateType(type: string): string {
  if (type in TAB_TYPES_VALUES) {
    return TAB_TYPES_VALUES[type]
  } else {
    throw new Error(
      `Unknown type '${type}'. Accepted types are: '${Object.keys(
        TAB_TYPES_VALUES,
      ).join("', '")}'`,
    )
  }
}

export async function getTabsList(
  url: string,
  args: ApiArgsSearch,
): Promise<ApiResponseSearch> {
  const { page, browser } = await getPuppeteerConf()
  console.log(`Searching: ${url}`)
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    )
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    // wait for selector if Cloudflare bot detection page need to be bypass first
    await page.waitForSelector('.js-page', { timeout: 15000 })
    const source = args.source
    const q = args.q
    const tabsParsed: ApiResponseSearch = await page.evaluate(
      ({ source, q }) => {
        const data = window.UGAPP.store.page.data
        let results: TabScrapped[] = [
          ...(data?.other_tabs || []),
          ...(data?.results || []),
        ]

        const pagination: Pagination = {
          current: data.pagination.current,
          total: data.pagination.total,
        }
        const tabs: Tab[] = results
          .filter((result) => {
            const isTypeExcluded =
              !result.marketing_type &&
              !['Pro', 'Power', 'Official', 'Drums', 'Video'].includes(
                result.type,
              )

            if (source === 'artist_name') {
              return (
                isTypeExcluded &&
                result.artist_name &&
                result.artist_name.toLowerCase().includes(q.toLowerCase())
              )
            } else if (source === 'song_name') {
              return (
                isTypeExcluded &&
                result.song_name &&
                result.song_name.toLowerCase().includes(q.toLowerCase())
              )
            } else {
              return isTypeExcluded
            }
          })
          .map((result) => ({
            artist: result.artist_name,
            name: result.song_name,
            url: result.tab_url,
            // Manage URL formatted like '/tab/[ID]'
            slug:
              result.tab_url.split('/').length === 5
                ? result.tab_url.split('/').splice(-1).join('/')
                : result.tab_url.split('/').splice(-2).join('/'),
            rating: parseFloat(result.rating.toFixed(2)),
            numberRates: result.votes,
            type:
              result.type === 'Ukulele Chords'
                ? 'Ukulele'
                : result.type === 'Bass Tabs'
                ? 'Bass'
                : result.type,
          }))

        const response: ApiResponseSearch = { results: tabs, pagination }
        return response
      },
      { source, q },
    )
    await browser.close()
    return tabsParsed
  } catch (error) {
    console.error(`Search Error at ${url}:`, error)
  } finally {
    if (browser) await browser.close()
  }
}

export async function getTab(
  url: string,
  width?: string,
  height?: string,
): Promise<ApiResponseTab> {
  console.log('--- STARTING TAB FETCH ---')
  console.log(`URL: ${url}`)
  
  const { page, browser } = await getPuppeteerConf({
    widthBrowser: width,
    heightBrowser: height,
  })

  try {
    // 1. Get Tab Info (Desktop View)
    console.log(`[1/2] Fetching tab metadata...`)
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    )
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.js-page', { timeout: 15000 })
    
    const tabParsed: Tab = await page.evaluate(() => {
      const { tab_view } = window.UGAPP.store.page.data
      const {
        tab_url,
        artist_name,
        song_name,
        rating,
        votes,
        type,
      }: TabScrapped = window.UGAPP.store.page.data.tab
      const tuning: string[] = tab_view?.meta?.tuning?.value?.split(' ') || [
        'E', 'A', 'D', 'G', 'B', 'E',
      ]
      const difficulty: string = tab_view?.ug_difficulty || 'unknown'
      const tonality: string = tab_view?.meta?.tonality || 'unknown'
      const capo: string = tab_view?.meta?.capo || 'no capo'
      const raw_tabs: string = tab_view?.wiki_tab?.content || ''
      
      const applicature = tab_view?.applicature || window.UGAPP.store.page.data.tab?.applicature
      
      let chordsDiagrams: UGChordCollection = {}
      if (applicature) {
        if (Array.isArray(applicature)) {
          // Some songs have applicature as [{ "G": [...] }, { "C": [...] }]
          // Others might have it as [{ "chord": "G", "variations": [...] }]
          chordsDiagrams = applicature.reduce((acc: UGChordCollection, curr: any) => {
            if (curr.chord && curr.variations) {
              acc[curr.chord] = curr.variations
            } else {
              Object.assign(acc, curr)
            }
            return acc
          }, {})
        } else if (typeof applicature === 'object') {
          chordsDiagrams = applicature
        }
      }
      const versions: TabScrapped[] =
        tab_view?.versions.filter(
          (tab: TabScrapped) => tab.type !== 'Official',
        ) || []
      
      let versionsFormatted: Tab[] = versions.map((tabScrapped) => ({
        artist: tabScrapped.artist_name,
        name: tabScrapped.song_name,
        url: tabScrapped.tab_url,
        difficulty: tabScrapped.difficulty,
        numberRates: tabScrapped.votes,
        type: tabScrapped.type,
        slug: tabScrapped.tab_url.split('/').splice(-2).join('/'),
        rating: parseFloat(tabScrapped.rating.toFixed(2)),
      }))

      if (Array.isArray(versionsFormatted)) {
        versionsFormatted = versionsFormatted.sort((elem1, elem2) => 
          (elem2.rating * elem2.numberRates) - (elem1.rating * elem1.numberRates)
        )
      }

      return {
        artist: artist_name,
        name: song_name,
        url: tab_url,
        difficulty,
        tuning,
        tonality,
        capo,
        raw_tabs,
        numberRates: votes,
        type: type,
        slug: tab_url.split('/').splice(-2).join('/'),
        rating: parseFloat(rating.toFixed(2)),
        versions: versionsFormatted,
        chordsDiagrams,
      }
    })

    // 2. Get Responsive Tab (Mobile View)
    console.log(`[2/2] Fetching responsive content...`)
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    )
    // Reload with mobile UA
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.js-page', { timeout: 15000 })

    const tabResponsive: string = await page.evaluate(() => {
      return document.querySelector('pre')?.outerHTML || ''
    })

    tabParsed.htmlTab = sanitizeHtml(tabResponsive, {
      allowedAttributes: {
        span: ['class'],
      },
    })

    console.log('--- TAB FETCH COMPLETED SUCCESS ---')
    await browser.close()
    
    const { access_token } = await getSpotifyAccessToken()
    return { tab: tabParsed, spotify_access_token: access_token }

  } catch (error) {
    console.error(`--- TAB FETCH FAILED ---`)
    console.error(error)
    if (browser) await browser.close()
    return null
  }
}
