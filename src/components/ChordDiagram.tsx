import {
  Box,
  IconButton,
  useColorModeValue,
  Text,
  Flex,
} from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@chakra-ui/react'
import useAppStateContext from '../hooks/useAppStateContext'
import * as vexchords from 'vexchords'
const { ChordBox } = vexchords as any
import { ChevronLeftIcon, ChevronRightIcon, EditIcon } from '@chakra-ui/icons'
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Portal,
  SimpleGrid,
} from '@chakra-ui/react'
import {
  UGChord,
  UGChordCollection,
  VexchordsChord,
  VexchordsOptions,
} from '../types/tabs'

interface ChordDiagramState {
  [key: string]: number
}

export default function ChordDiagram(): JSX.Element {
  const borderLightColor = useColorModeValue('gray.200', 'gray.700')
  const chordColor = useColorModeValue('#000000', '#ffffff')
  const fretColor = useColorModeValue('#4A5568', '#cccccc') // gray.600 in light, light gray in dark
  const dotLabelColor = useColorModeValue('#ffffff', '#000000') // invert for the dots
  const chordDiagramRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const { 
    selectedTabContent, 
    transposeAmount, 
    isSimplified,
    chordEdits,
    setChordEdits,
    extraChords,
    setExtraChords
  } = useAppStateContext()
  const [chordDiagramIndex, setChordDiagramIndex] = useState<ChordDiagramState>(
    {},
  )
  const [chordSelected, setChordSelected] = useState<string>('')
  const [selectedChordIdx, setSelectedChordIdx] = useState<number | null>(null)
  const highlightedElRef = useRef<HTMLSpanElement | null>(null)

  const chordsDiagrams = useMemo(() => {
    const combined: UGChordCollection = {}
    // extraChords is now our session-wide Global Library
    Object.entries(extraChords || {}).forEach(([k, v]) => {
      combined[k.toLowerCase()] = v
    })
    return combined
  }, [extraChords])

  const activeChordName = useMemo(() => {
    const activeEdit = selectedChordIdx !== null ? chordEdits[selectedChordIdx] : null
    return (activeEdit?.name || chordSelected || '').trim()
  }, [selectedChordIdx, chordEdits, chordSelected])

  // Automatic diagram fetcher
  useEffect(() => {
    if (!activeChordName) return
    // Robust normalization: trim, lowercase, and strip any invisible characters or weird spaces
    const cleanName = activeChordName.trim().replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, '')
    const normalized = cleanName.toLowerCase()
    
    // Don't fetch if we already have it (case-insensitive)
    if (chordsDiagrams[normalized] || chordsDiagrams[normalized.replace(/maj$/, '')]) return

    const fetchDiagram = async () => {
      try {
        console.log('[ChordDiagram] Proactive fetch starting for:', cleanName)
        // Use a generic numeric key "0" so the API recognizes it as a chord to fetch
        const res = await fetch(`${window.location.origin}/api/transpose?0=${encodeURIComponent(cleanName)}`)
        const data = await res.json()
        if (data && Object.keys(data).length > 0) {
          console.log('[ChordDiagram] Proactive fetch success for:', cleanName, data)
          setExtraChords(prev => ({ ...prev, ...data }))
        } else {
          console.warn('[ChordDiagram] Proactive fetch returned no data for:', cleanName)
        }
      } catch (err) {
        console.error('[ChordDiagram] Proactive fetch failed:', err)
      }
    }

    fetchDiagram()
  }, [activeChordName, chordsDiagrams, setExtraChords])

  const clearHighlight = () => {
    if (highlightedElRef.current) {
      highlightedElRef.current.style.outline = 'none'
      highlightedElRef.current.style.borderRadius = 'none'
      highlightedElRef.current = null
    }
  }

  // Handle chord clicks
  useEffect(() => {
    const chordsElements = document.querySelectorAll('span.js-chord-chord')
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation()
      const el = e.currentTarget as HTMLSpanElement
      const name = el.innerText.trim()
      const idxStr = el.getAttribute('data-chord-idx')
      const idx = idxStr ? parseInt(idxStr) : null
      
      clearHighlight()
      el.style.outline = '2px solid #ed8936'
      el.style.borderRadius = '4px'
      highlightedElRef.current = el

      setChordSelected(name)
      setSelectedChordIdx(idx)
    }

    chordsElements?.forEach((el: HTMLSpanElement) => el.addEventListener('click', handleClick as any))
    return () => {
      clearHighlight()
      chordsElements?.forEach((el: HTMLSpanElement) => el.removeEventListener('click', handleClick as any))
    }
  }, [selectedTabContent?.htmlTab, transposeAmount, isSimplified, chordEdits])

  useEffect(() => {
    if (!chordSelected) {
      clearHighlight()
      setSelectedChordIdx(null)
    }
  }, [chordSelected])

  // Remove diagram when changing tab
  useEffect(() => {
    if (selectedTabContent?.url) {
      setChordSelected('')
    }
  }, [selectedTabContent?.url])

  // Close diagram when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).classList.contains('js-chord-chord')) {
          setChordSelected('')
        }
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [setChordSelected])

  // Ensure highlight persists after re-renders
  useEffect(() => {
    if (selectedChordIdx !== null && selectedTabContent?.htmlTab) {
      // Small timeout to wait for HTMLReactParser to update the DOM
      const timer = setTimeout(() => {
        const el = document.querySelector(`span.js-chord-chord[data-chord-idx="${selectedChordIdx}"]`) as HTMLSpanElement
        if (el) {
          clearHighlight()
          el.style.outline = '2px solid #ed8936'
          el.style.borderRadius = '4px'
          highlightedElRef.current = el
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [selectedChordIdx, selectedTabContent?.htmlTab, chordEdits])

  // Toggling diagram
  useEffect(() => {
    if (!activeChordName || !chordDiagramRef.current) {
      if (chordDiagramRef.current) chordDiagramRef.current.innerHTML = ''
      return
    }

    try {
      const name = activeChordName.trim().replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, '')
      const search = name.toLowerCase()
      
      // Multi-step fuzzy lookup
      const lookupKey = () => {
        const variations = [
          search,
          search.replace(/maj$/, ''),
          search + 'maj',
          search.replace(/m$/, 'min'),
          search.replace(/min$/, 'm'),
          search.replace(/7$/, ''),
          search.replace(/#/, 's'), // some APIs use 's' for sharp
          search.replace(/b/, 'f'), // some APIs use 'f' for flat
        ]
        for (const k of variations) {
          if (chordsDiagrams[k]) return chordsDiagrams[k]
        }
        // Last ditch: check if any key contains our search term or vice versa
        const partialMatch = Object.keys(chordsDiagrams).find(k => k.includes(search) || search.includes(k))
        if (partialMatch) return chordsDiagrams[partialMatch]
        return null
      }

      let chordDiagram = lookupKey()
      if (!chordDiagram) {
        console.warn('[ChordDiagram] No diagram found for:', name)
        // If we have no diagram, the fetcher effect should eventually fix this
        if (chordDiagramRef.current) chordDiagramRef.current.innerHTML = ''
        return
      }

      chordDiagramRef.current.innerHTML = ''

      const chordBoxOptions = {
        width: 140,
        height: 140,
        circleRadius: 4,
        strokeColor: chordColor,
        textColor: chordColor,
        bridgeColor: chordColor,
        stringColor: fretColor,
        fretColor: fretColor,
        labelColor: dotLabelColor,
        bgColor: 'transparent'
      }

      const chordBoxReference = new ChordBox(
        chordDiagramRef.current,
        chordBoxOptions,
      )
      
      // Ensure we have at least one variation
      const variations = Array.isArray(chordDiagram) ? chordDiagram : [chordDiagram]
      const diagramSelectedIndex = typeof chordDiagramIndex[search] === 'number'
        ? chordDiagramIndex[search]
        : 0
        
      const chordDiagramSelected = variations[diagramSelectedIndex] || variations[0]
      if (!chordDiagramSelected) return

      const position = chordDiagramSelected.fret || 1
      const fretValues = chordDiagramSelected.frets || []
      const fingers = chordDiagramSelected.fingers || []
      const barChordConfiguration = chordDiagramSelected.listCapos?.[0]
      
      const formattedChordsArray: VexchordsChord = fretValues.map(
        (stringElement: any, index: number) => {
          const positionValueAdjustment = position > 0 ? position - 1 : 0
          let fretValue: any = stringElement
          if (typeof stringElement === 'number') {
            fretValue = stringElement === -1 ? 'x' : stringElement - positionValueAdjustment
          } else if (stringElement === 'x' || stringElement === 'X') {
            fretValue = 'x'
          }
          const finger = fingers[index]
          return [index + 1, fretValue, finger > 0 ? finger : undefined]
        },
      ) as any

      const formattedVexchord: VexchordsOptions = {
        name: name,
        chord: formattedChordsArray,
        position: position,
        barres: barChordConfiguration ? [
          {
            toString: barChordConfiguration.lastString + 1,
            fromString: barChordConfiguration.startString + 1,
            fret: position > 0 
                  ? barChordConfiguration.fret - position + 1 
                  : barChordConfiguration.fret,
          },
        ] : [],
      }

      chordBoxReference.draw(formattedVexchord)
    } catch (err) {
      console.error('[ChordDiagram] Error drawing chord:', err)
    }
  }, [chordDiagramIndex, chordsDiagrams, activeChordName, chordColor, fretColor, dotLabelColor])

  return (
    <Flex
      ref={containerRef}
      position={'fixed'}
      right={'17px'}
      bottom="17px"
      borderRadius={'lg'}
      bg={borderLightColor}
      textAlign="center"
      className="chord--diagram"
      display={!chordSelected ? 'none' : 'flex'}
      flexDirection={'column'}
      alignItems={'center'}
      px={2}
      pb={1}
      zIndex={200} // Increase zIndex to ensure it stays on top
      boxShadow="2xl"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Flex w="100%" justifyContent="space-between" pt={1} px={1}>
        <Flex alignItems="center">
          <IconButton
            aria-label="Shift Left"
            icon={<ChevronLeftIcon />}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              if (selectedChordIdx === null) return
              setChordEdits(prev => ({
                ...prev,
                [selectedChordIdx]: {
                  ...prev[selectedChordIdx],
                  offset: (prev[selectedChordIdx]?.offset || 0) - 1
                }
              }))
            }}
          />
          
          <Menu isLazy matchWidth={false}>
            <MenuButton
              as={Button}
              variant="ghost"
              size="xs"
              rightIcon={<EditIcon />}
              mx={1}
              fontSize="xs"
              onClick={(e) => e.stopPropagation()}
            >
              Change
            </MenuButton>
            <MenuList zIndex={210} boxShadow="xl" p={2} minW="200px">
              <Text fontSize="xs" fontWeight="bold" mb={1} px={2}>Root</Text>
              <SimpleGrid columns={4} spacing={1} mb={3}>
                {['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'].map(r => (
                  <Button 
                    key={r} 
                    size="xs" 
                    onClick={(e) => {
                      e.stopPropagation()
                      if (selectedChordIdx === null) return
                      const currentEdit = chordEdits[selectedChordIdx]
                      const currentName = currentEdit?.name || chordSelected
                      const suffix = currentName.replace(/^[A-G]#?/, '')
                      const newName = r + suffix
                      
                      setChordEdits(prev => ({
                        ...prev,
                        [selectedChordIdx]: { ...prev[selectedChordIdx], name: newName }
                      }))
                    }}
                  >
                    {r}
                  </Button>
                ))}
              </SimpleGrid>
              
              <Text fontSize="xs" fontWeight="bold" mb={1} px={2}>Type</Text>
              <SimpleGrid columns={3} spacing={1}>
                {['', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', 'add9', '9', 'dim', 'aug'].map(s => (
                  <Button 
                    key={s} 
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (selectedChordIdx === null) return
                      const currentEdit = chordEdits[selectedChordIdx]
                      const currentName = currentEdit?.name || chordSelected
                      const root = currentName.match(/^[A-G]#?/)?.[0] || 'C'
                      const newName = root + s
                      
                      setChordEdits(prev => ({
                        ...prev,
                        [selectedChordIdx]: { ...prev[selectedChordIdx], name: newName }
                      }))
                    }}
                  >
                    {s || 'maj'}
                  </Button>
                ))}
              </SimpleGrid>
            </MenuList>
          </Menu>

          <IconButton
            aria-label="Shift Right"
            icon={<ChevronRightIcon />}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              if (selectedChordIdx === null) return
              setChordEdits(prev => ({
                ...prev,
                [selectedChordIdx]: {
                  ...prev[selectedChordIdx],
                  offset: (prev[selectedChordIdx]?.offset || 0) + 1
                }
              }))
            }}
          />
        </Flex>

        <IconButton
          aria-label="Close diagram"
          icon={<span>&times;</span>}
          size="xs"
          variant="ghost"
          onClick={() => setChordSelected('')}
        />
      </Flex>
      <div ref={chordDiagramRef}></div>
      <Text py={1} fontSize="lg" fontWeight="bold">
        {activeChordName}
      </Text>
    </Flex>
  )
}
