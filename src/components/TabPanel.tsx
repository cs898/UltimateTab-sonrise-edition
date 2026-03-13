import { ChevronDownIcon, StarIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  Text,
  Tooltip,
  useBreakpointValue,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import HTMLReactParser from 'html-react-parser'
import { GiGuitarHead } from 'react-icons/gi'
import { RiHeartFill, RiHeartLine } from 'react-icons/ri'
import { FaCircleArrowDown } from 'react-icons/fa6'
import { GiMusicalScore } from 'react-icons/gi'
import { GiCrowbar } from 'react-icons/gi'
import Difficulty from './Difficulty'
import { Tab, UGChordCollection } from '../types/tabs'
import { MouseEventHandler, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { FaPlayCircle } from 'react-icons/fa'
import ChordTransposer from './ChordTransposer'
import BackingtrackPlayer from './BackingtrackPlayer'
import Autoscroller from './Autoscroller'
import useAppStateContext from '../hooks/useAppStateContext'
import FontSizeManager from './FontSizeManager'
import TabActionButtons from './TabActionButtons'
import dynamic from 'next/dynamic'

const ChordDiagram = dynamic(() => import('./ChordDiagram'), { ssr: false })

interface TabPanelProps {
  selectedTab: Tab
  isFavorite: boolean
  selectedTabContent: Tab
  isLoading: boolean
  handleClickFavorite: MouseEventHandler<HTMLButtonElement>
  refetchTab: Function
}

export default function TabPanel({
  selectedTab,
  isFavorite,
  selectedTabContent,
  isLoading,
  handleClickFavorite,
  refetchTab,
}: TabPanelProps) {
  const router = useRouter()
  const { 
    tabFontSize, 
    transposeAmount, 
    setTransposeAmount,
    baseKeyAmount, 
    setBaseKeyAmount,
    isSimplified, 
    setIsSimplified,
    userKey, 
    setUserKey, 
    sessionCapo,
    setSessionCapo,
    chordLockAmount,
    setChordLockAmount,
    chordEdits,
    setChordEdits,
    setlist,
    isLiveMode,
    showAutoscroll,
    setShowAutoscroll
  } = useAppStateContext()

  const transposeNote = (note: string, amount: number): string => {
    if (!note) return ''
    const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    // Handle complex tonalities (e.g., "Am", "Gmaj7") by transposing only the root
    return note.replace(/[CDEFGAB]#?/g, (match) => {
      const idx = scale.indexOf(match)
      if (idx === -1) return match
      const newIdx = ((idx + amount) % 12 + 12) % 12
      return scale[newIdx]
    })
  }

  const parseCapo = (capoStr: any): number => {
    if (!capoStr) return 0
    if (typeof capoStr === 'number') return capoStr
    const str = String(capoStr).toLowerCase()
    if (str.includes('no capo')) return 0
    const match = str.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  const formatCapo = (fret: number): string => {
    const normalizedFret = ((fret % 12) + 12) % 12
    if (normalizedFret === 0) return 'no capo'
    
    const v100 = normalizedFret % 100
    if (v100 === 11 || v100 === 12 || v100 === 13) return `${normalizedFret}th fret`
    
    const suffixes = ['th', 'st', 'nd', 'rd']
    const v10 = normalizedFret % 10
    const suffix = suffixes[v10] || suffixes[0]
    return `${normalizedFret}${suffix} fret`
  }

  const simplifyChord = (chord: string): string => {
    if (!chord) return ''
    // 1. Remove slash part (G/B -> G)
    const base = chord.split('/')[0]
    
    // 2. Extract root (e.g., A, G#, Bb)
    const rootMatch = base.match(/^[A-G][#b]?/)
    if (!rootMatch) return base
    const root = rootMatch[0]
    const remainder = base.slice(root.length)
    
    // 3. Keep minor if it is minor, otherwise just root (Gsus4 -> G, Am7 -> Am)
    const isMinor = remainder.startsWith('m') && !remainder.startsWith('maj')
    return root + (isMinor ? 'm' : '')
  }

  const processTabContent = (html: string, simplifyOn: boolean, transposeBy: number, chordEdits: Record<number, {name?: string, offset?: number}>): string => {
    if (!html) return html

    const chordRegex = /<span[^>]*class="[^"]*js-chord-chord[^"]*"[^>]*>(.*?)<\/span>/g
    let globalChordIdx = 0

    const lines = html.split('\n')
    const resultLines = lines.map((line) => {
      // Pre-check: If the line has no chords, just return it (after cleaning nbsp)
      if (!line.includes('js-chord-chord')) {
        return line.replace(/&nbsp;/g, ' ')
      }

      // 1. Parse line into alternating segments: [gap, chord, gap, chord, ..., gap]
      const segments: { type: 'gap' | 'chord', text: string, idx?: number }[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null
      
      const localRegex = new RegExp(chordRegex.source, 'g')
      
      while ((match = localRegex.exec(line)) !== null) {
        segments.push({ type: 'gap', text: line.slice(lastIndex, match.index).replace(/&nbsp;/g, ' ') })
        segments.push({ type: 'chord', text: match[1].replace(/&nbsp;/g, ' '), idx: globalChordIdx++ })
        lastIndex = localRegex.lastIndex
      }
      segments.push({ type: 'gap', text: line.slice(lastIndex).replace(/&nbsp;/g, ' ') })

      // 2. Process segments into finalized HTML
      let lastSimplified: string | null = null
      let lineHtml = ''

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        if (seg.type === 'gap') {
          const prevChordEdit = i > 0 ? chordEdits[segments[i-1].idx!] : null
          const nextChordEdit = i < segments.length - 1 ? chordEdits[segments[i+1].idx!] : null
          
          let gapLen = seg.text.length
          if (prevChordEdit?.offset) gapLen -= prevChordEdit.offset
          if (nextChordEdit?.offset) gapLen += nextChordEdit.offset
          
          const isPureWhitespace = /^\s*$/.test(seg.text)
          if (isPureWhitespace) {
            lineHtml += ' '.repeat(Math.max(0, gapLen))
          } else {
            // If the gap has text (lyrics), keep it! 
            // We just truncate or pad with spaces if really needed, but usually we just return it.
            lineHtml += seg.text
          }
        } else {
          const edit = chordEdits[seg.idx!]
          const rawName = edit?.name || seg.text
          const renderedContent = rawName.trim()
          
          const transposed = transposeNote(renderedContent, transposeBy)
          const simplified = simplifyOn ? simplifyChord(transposed) : transposed
          
          if (simplifyOn && simplified === lastSimplified) {
            lineHtml += ' '.repeat(seg.text.length)
          } else {
            if (simplifyOn) lastSimplified = simplified
            
            const nameDelta = simplified.length - seg.text.length
            lineHtml += `<span class="js-chord-chord" data-chord-idx="${seg.idx}">${simplified}</span>`
            
            if (i < segments.length - 1) {
              const nextGap = segments[i+1]
              // Only shrink next gap if it's whitespace
              if (/^\s*$/.test(nextGap.text)) {
                nextGap.text = ' '.repeat(Math.max(0, nextGap.text.length - nameDelta))
              }
            }
          }
        }
      }

      return lineHtml
    })

    return resultLines.join('\n')
  }

  // --- Chord-First Logic Helpers ---
  // 1. playedKey: The key based on chord shapes on screen.
  // 2. capoOffset: The fret position (0 = No Capo).
  // 3. audibleKey: The actual pitch heard.
  // Equation: audibleKey = playedKey + capoOffset

  const getBaseWrittenKey = (): string => {
    const originalAudible = selectedTabContent?.tonality || ''
    const originalCapo = parseCapo(selectedTabContent?.capo)
    
    // The "Nominal" key is the key of the chords in the file.
    // metadata_audible - metadata_capo = nominal
    if (!originalAudible || originalAudible === 'unknown') {
      return inferKey(selectedTabContent?.htmlTab || '') || 'C'
    }
    return transposeNote(originalAudible, -originalCapo)
  }

  const getPlayedKey = (): string => {
    return transposeNote(getBaseWrittenKey(), transposeAmount)
  }

  const getAudibleKey = (): string => {
    // If the user corrected the key via "Fix Wrong Key", we respect that sound correction.
    if (userKey) {
      return transposeNote(userKey, transposeAmount)
    }

    if (baseKeyAmount !== null) {
      // Locked Mode: Audible key is constant relative to when the lock was set.
      const originalCapo = parseCapo(selectedTabContent?.capo)
      return transposeNote(getBaseWrittenKey(), baseKeyAmount + originalCapo)
    }

    // Standard Mode: AudibleKey = PlayedKey + EffectiveCapo
    const effectiveCapo = sessionCapo !== null ? sessionCapo : parseCapo(selectedTabContent?.capo)
    return transposeNote(getPlayedKey(), effectiveCapo)
  }

  const getDynamicCapoFret = (): number => {
    if (baseKeyAmount === null) {
      return sessionCapo !== null ? sessionCapo : parseCapo(selectedTabContent?.capo)
    }
    
    // Locked Mode: Capo = Audible - Played
    const offset = getNoteDistance(getPlayedKey(), getAudibleKey())
    return ((offset % 12) + 12) % 12
  }

  const getNoteDistance = (from: string, to: string): number => {
    const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const normalize = (note: string) => {
      const baseNote = note.replace(/m$/, '').replace(/maj7?$/, '').replace(/su(s|p)\d?/, '')
      if (baseNote === 'Db') return 'C#'
      if (baseNote === 'Eb') return 'D#'
      if (baseNote === 'Gb') return 'F#'
      if (baseNote === 'Ab') return 'G#'
      if (baseNote === 'Bb') return 'A#'
      return baseNote
    }
    const fromIdx = scale.indexOf(normalize(from))
    const toIdx = scale.indexOf(normalize(to))
    if (fromIdx === -1 || toIdx === -1) return 0
    return toIdx - fromIdx
  }

  const handleClearCapo = () => {
    setSessionCapo(0)
    setBaseKeyAmount(null) // Return to normal mode where sound follows chords
    setChordLockAmount(null)
    setUserKey(null)      // Reset any manual pitch corrections
  }

  const inferKey = (html: string): string | null => {
    if (!html) return null
    const chordRegex = /<span[^>]*class="[^"]*js-chord-chord[^"]*"[^>]*>(.*?)<\/span>/g
    const matches = Array.from(html.matchAll(chordRegex))
    if (matches.length === 0) return null

    const rawChords = matches.map((m) => m[1].replace(/&nbsp;/g, ' ').trim())

    const scaleMap: Record<string, string[]> = {
      'C':  ['C', 'Dm', 'Em', 'F', 'G', 'Am'],
      'C#': ['C#', 'D#m', 'Fm', 'F#', 'G#', 'A#m'],
      'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm'],
      'D':  ['D', 'Em', 'F#m', 'G', 'A', 'Bm'],
      'D#': ['D#', 'Fm', 'Gm', 'G#', 'A#', 'Cm'],
      'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm'],
      'E':  ['E', 'F#m', 'G#m', 'A', 'B', 'C#m'],
      'F':  ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm'],
      'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m'],
      'Gb': ['Gb', 'Abm', 'Bbm', 'B', 'Db', 'Ebm'],
      'G':  ['G', 'Am', 'Bm', 'C', 'D', 'Em'],
      'G#': ['G#', 'A#m', 'Cm', 'C#', 'D#', 'Fm'],
      'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm'],
      'A':  ['A', 'Bm', 'C#m', 'D', 'E', 'F#m'],
      'A#': ['A#', 'Cm', 'Dm', 'D#', 'F', 'Gm'],
      'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm'],
      'B':  ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m'],
    }

    const scores: Record<string, number> = {}
    Object.keys(scaleMap).forEach((key) => {
      scores[key] = 0
      const scale = scaleMap[key]
      rawChords.forEach((chord, index) => {
        const simplified = simplifyChord(chord)
        if (simplified === key) scores[key] += index === 0 ? 10 : 5
        else if (simplified === scale[3] || simplified === scale[4]) scores[key] += 3
        else if (scale.includes(simplified)) scores[key] += 1
        else scores[key] -= 5
      })
    })

    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
  }
  const ALL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']
  const ALL_KEYS_MINOR = ALL_KEYS.map(k => k + 'm')
  const DISPLAY_KEYS = [...ALL_KEYS, ...ALL_KEYS_MINOR]

  const [chordsDiagrams, setChordsDiagrams] = useState<UGChordCollection>(
    selectedTabContent?.chordsDiagrams,
  )

  const [showBackingTrack, setShowBackingTrack] = useState<boolean>(false)

  const flexSongNameDirection = useBreakpointValue({
    base:
      selectedTabContent &&
      selectedTabContent.artist?.length + selectedTabContent.name?.length > 30
        ? 'column'
        : 'row',
    sm: 'row',
  })
  const borderLightColor = useColorModeValue('gray.200', 'gray.700')
  const widthThirdRow = useBreakpointValue({ base: '100%', md: 'initial' })
  const marginTopThirdRow = useBreakpointValue({ base: 0, md: 2 })
  const paddingTopThirdRow = useBreakpointValue({ base: 1, md: 0 })
  const flexCapoDirection = useBreakpointValue({ base: 'column-reverse', sm: 'row' })
  const flexControlsDirection = useBreakpointValue({ base: 'column', md: 'row' })

  useEffect(() => {
    setChordsDiagrams(selectedTabContent?.chordsDiagrams)
  }, [selectedTabContent])

  // Sync all song-specific settings when the ACTUAL song changes (slug changes)
  const lastSlugRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedTab?.slug && selectedTab.slug !== lastSlugRef.current) {
      lastSlugRef.current = selectedTab.slug
      const setlistItem = setlist?.find(item => item?.tab?.slug === selectedTab.slug)
      
      // Restore from setlist if present, otherwise reset to defaults
      setUserKey(setlistItem?.userKey ?? null)
      setTransposeAmount(setlistItem?.transposeAmount ?? 0)
      setBaseKeyAmount(setlistItem?.baseKeyAmount ?? null)
      setIsSimplified(setlistItem?.isSimplified ?? false)
      setChordsDiagrams(setlistItem?.chordsDiagrams ?? selectedTabContent?.chordsDiagrams)
    }
  }, [selectedTab?.slug, setlist, setUserKey, setTransposeAmount, setBaseKeyAmount, setIsSimplified])

  return (
    <>
      <Box
        h="100%"
        px={5}
        py={2}
        borderBottomStyle={'solid'}
        borderBottomWidth={selectedTabContent && '1px'}
        borderBottomColor={borderLightColor}
      >
        <Skeleton
          justifyContent={'space-between'}
          flexDirection="column"
          display={'flex'}
          h="100%"
          isLoaded={!isLoading}
        >
          <Flex justifyContent={'space-between'} alignItems={'center'}>
            <Flex alignItems={'center'} pb={0}>
              <Flex
                alignItems={'baseline'}
                flexDirection={flexSongNameDirection as 'row' | 'column'}
                py={1}
              >
                <Text fontSize={'lg'} as="b" mr={1}>
                  {selectedTabContent?.artist}
                </Text>{' '}
                <Text fontSize={'md'}>{selectedTabContent?.name}</Text>
              </Flex>
            </Flex>
            {!isLiveMode && (
              <Flex fontSize={'sm'} justifyContent={'start'}>
                <Tooltip
                  placement="right"
                  label={
                    isFavorite ? 'Remove from favorites' : 'Add to favorites'
                  }
                >
                  <IconButton
                    icon={isFavorite ? <RiHeartFill /> : <RiHeartLine />}
                    onClick={handleClickFavorite}
                    colorScheme={isFavorite ? 'red' : 'gray'}
                    variant="ghost"
                    aria-label="Add to favorites"
                    size={'md'}
                  />
                </Tooltip>
              </Flex>
            )}
          </Flex>

          {/* --- LIVE MODE COMPACT LAYOUT SECTION --- */}
          {isLiveMode && (
            <Flex flexDirection="column" mt={2} mb={1}>
              {/* Line 1: Audible Key | Capo | Tuning */}
              <Flex justifyContent="space-between" alignItems="center" w="100%" mb={2}>
                <Flex fontSize="sm" alignItems="center">
                  <Text color="gray.500" as="b" mr={1}>
                    Audible Key
                  </Text>{' '}
                  <Icon boxSize={5} as={GiMusicalScore} mr={1} />
                  <Badge colorScheme={baseKeyAmount !== null || userKey ? 'blue' : 'gray'} variant="subtle" fontWeight="normal">
                    {getAudibleKey()}
                  </Badge>
                  {selectedTabContent?.tonality === 'unknown' && !userKey && (
                    <Text fontSize="xs" color="gray.500" fontStyle="italic" ml={2}>
                      (Inferred)
                    </Text>
                  )}
                </Flex>

                <Flex fontSize="sm" alignItems="center">
                  <Text color="gray.500" as="b" mr={1}>
                    Capo
                  </Text>{' '}
                  <Icon boxSize={5} as={GiCrowbar} mr={1} />
                  <Badge colorScheme={baseKeyAmount !== null || sessionCapo !== null ? 'blue' : 'gray'} variant="subtle" fontWeight="normal">
                    {formatCapo(getDynamicCapoFret())}
                  </Badge>
                  <Text display={{base: 'none', md: 'block'}} fontSize="xs" color="gray.500" fontStyle="italic" ml={2}>
                    (Playing in {getPlayedKey()})
                  </Text>
                </Flex>

                <Flex fontSize="sm" alignItems="center">
                  <Text display={{base: 'none', sm: 'block'}} color="gray.500" as="b" mr={1}>
                    Tuning
                  </Text>{' '}
                  <Icon boxSize={5} as={GiGuitarHead} mr={1} />
                  <Text fontSize="sm">{selectedTabContent?.tuning.join(' ')}</Text>
                </Flex>
              </Flex>
            </Flex>
          )}
          {/* --- END LIVE MODE COMPACT LAYOUT SECTION --- */}

          {/* Edit Mode: Ratings and Difficulty Row */}
          {!isLiveMode && (
            <Flex alignItems={'center'} justifyContent={'space-between'} py={1}>
              <Flex alignItems={'center'}>
                <StarIcon
                  fontSize={'sm'}
                  color={'yellow.400'}
                  position="relative"
                  top="-0.05rem"
                  mr={'5px'}
                />{' '}
                <Flex>
                  {selectedTabContent?.rating} ({selectedTabContent?.numberRates})
                </Flex>
              </Flex>
              {selectedTabContent?.versions.length > 0 && (
                <Menu>
                  <MenuButton
                    as={Button}
                    variant="outline"
                    _hover={{ bg: 'blue.300', color: 'white' }}
                    _active={{ bg: 'blue.600', color: 'white' }}
                    size={'sm'}
                    boxShadow="md"
                    fontWeight={'normal'}
                    px="3"
                    py="1"
                    rightIcon={<ChevronDownIcon />}
                    leftIcon={
                      <Icon
                        fontSize={'sm'}
                        color={'yellow.400'}
                        position="relative"
                        top="-0.05rem"
                        as={StarIcon}
                      />
                    }
                  >
                    More versions
                  </MenuButton>
                  <MenuList>
                    {selectedTabContent?.versions?.map((tab) => (
                      <MenuItem onClick={() => router.push(`/tab/${tab.slug}`)} key={tab.slug}>
                        <StarIcon fontSize={'sm'} color={'yellow.400'} position="relative" top="-0.05rem" mr={'5px'} />{' '}
                        {tab.rating} ({tab.numberRates})
                      </MenuItem>
                    ))}
                  </MenuList>
                 </Menu>
              )}
            </Flex>
          )}

          {/* Edit Mode: Audible Key and Difficulty Row */}
          {!isLiveMode && (
            <Flex justifyContent={'space-between'} flexDirection={'row'}>
              <Flex fontSize={'sm'} py={2} alignItems="center">
                <Text color={'gray.500'} as="b" mr={1}>
                  Audible Key
                </Text>{' '}
                <Icon boxSize={5} as={GiMusicalScore} mr={1} />
                <Badge
                  colorScheme={baseKeyAmount !== null || userKey ? 'blue' : 'gray'}
                  variant="subtle"
                  fontWeight="normal"
                >
                  {getAudibleKey()}
                </Badge>
                {selectedTabContent?.tonality === 'unknown' && !userKey && (
                  <Text fontSize="xs" color="gray.500" fontStyle="italic" ml={2}>
                    (Inferred)
                  </Text>
                )}
                <Menu size="sm">
                  <MenuButton as={Button} size="xs" variant="ghost" ml={2} rightIcon={<ChevronDownIcon />} px={2} colorScheme="blue" fontWeight="normal">
                    fix wrong key
                  </MenuButton>
                  <MenuList maxH="300px" overflowY="auto">
                    <MenuItem onClick={() => setUserKey(null)} fontWeight="bold">Reset to Default</MenuItem>
                    <MenuItem onClick={handleClearCapo} icon={<GiCrowbar />} color="blue.500">Clear Capo (Set to 0)</MenuItem>
                    {DISPLAY_KEYS.map((k) => (
                      <MenuItem key={k} onClick={() => setUserKey(k)}>{k}</MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </Flex>
              <Flex fontSize={'sm'} py={2}>
                <Text color={'gray.500'} as="b" mr={1}>
                  Difficulty
                </Text>{' '}
                <Difficulty level={selectedTabContent?.difficulty} />
              </Flex>
            </Flex>
          )}

          {/* Edit Mode: Capo and Tuning Row */}
          {!isLiveMode && (
            <Flex
              justifyContent={'space-between'}
              flexDirection={flexCapoDirection as 'row' | 'column-reverse'}
            >
              <Flex fontSize={'sm'} py={2} alignItems="center">
                <Text color={'gray.500'} as="b" mr={1}>
                  Capo
                </Text>{' '}
                <Icon boxSize={5} as={GiCrowbar} mr={1} />
                <Badge colorScheme={baseKeyAmount !== null || sessionCapo !== null ? 'blue' : 'gray'} variant="subtle" fontWeight="normal">
                  {formatCapo(getDynamicCapoFret())}
                </Badge>
                {(sessionCapo !== null || parseCapo(selectedTabContent?.capo) !== 0) && (
                  <Button
                    size="xs"
                    ml={2}
                    variant="ghost"
                    colorScheme="blue"
                    onClick={handleClearCapo}
                    leftIcon={<Icon as={GiCrowbar} />}
                    fontWeight="normal"
                  >
                    clear capo
                  </Button>
                )}
                <Text fontSize="xs" color="gray.500" fontStyle="italic" ml={2}>
                  (Playing in {getPlayedKey()})
                </Text>
              </Flex>{' '}
              <Flex fontSize={'sm'} py={2}>
                <Text color={'gray.500'} as="b" mr={1}>
                  Tuning
                </Text>{' '}
                <Icon boxSize={5} as={GiGuitarHead} mr={1} />
                {selectedTabContent?.tuning.join(' ')}
              </Flex>{' '}
            </Flex>
          )}

          {!isLiveMode && (
            <Flex
              justifyContent={'space-between'}
              flexDirection={flexControlsDirection as 'row' | 'column'}
              alignItems={'center'}
            >
              {chordsDiagrams && selectedTabContent?.type === 'Chords' && (
                <Flex
                  pb={1}
                  justifyContent={'start'}
                  w={widthThirdRow}
                  mt={marginTopThirdRow}
                  pt={paddingTopThirdRow}
                >
                  <ChordTransposer
                    chords={chordsDiagrams}
                    setChords={setChordsDiagrams}
                    originalCapo={selectedTabContent?.capo || 0}
                    audibleKey={getAudibleKey()}
                  />
                </Flex>
              )}

              <Flex pb={1} w={widthThirdRow} pt={0} flexWrap={'wrap'}>
                <FontSizeManager
                  w={widthThirdRow}
                  mt={marginTopThirdRow}
                  pt={paddingTopThirdRow}
                />
              </Flex>
              {selectedTabContent?.type != 'Chords' && (
                <TabActionButtons
                  w={widthThirdRow}
                  showBackingTrack={showBackingTrack}
                  setShowBackingTrack={setShowBackingTrack}
                  showAutoscroll={showAutoscroll}
                  setShowAutoscroll={setShowAutoscroll}
                  selectedTab={selectedTabContent}
                />
              )}
            </Flex>
          )}
          {!isLiveMode && chordsDiagrams && selectedTabContent?.type === 'Chords' && (
            <TabActionButtons
              w={widthThirdRow}
              showBackingTrack={showBackingTrack}
              setShowBackingTrack={setShowBackingTrack}
              showAutoscroll={showAutoscroll}
              setShowAutoscroll={setShowAutoscroll}
              selectedTab={selectedTabContent}
            />
          )}
        </Skeleton>
      </Box>

      <Flex
        p={5}
        h="100%"
        w="100%"
        flexGrow={1}
        alignItems={'stretch'}
        wrap={'wrap'}
        justifyContent="center"
      >
        <Skeleton display={'flex'} w="100%" isLoaded={!isLoading}>
          <Box
            h={'100%'}
            w="100%"
            fontSize={`${tabFontSize / 100}rem !important`}
          >
            {selectedTabContent && HTMLReactParser(processTabContent(selectedTabContent?.htmlTab, isSimplified, transposeAmount, chordEdits))}
          </Box>
        </Skeleton>
      </Flex>
      <ChordDiagram />
      <BackingtrackPlayer
        showBackingTrack={showBackingTrack}
        setShowBackingTrack={setShowBackingTrack}
        isLoading={isLoading}
        artist={selectedTabContent?.artist}
        songName={selectedTabContent?.name}
      />
      <Autoscroller
        showAutoscroll={showAutoscroll}
        setShowAutoscroll={setShowAutoscroll}
        isLoading={isLoading}
        bottomCSS={showBackingTrack ? '87px' : '17px'}
      />
    </>
  )
}
