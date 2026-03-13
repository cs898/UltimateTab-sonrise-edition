import { Button, Flex, Icon, useBreakpointValue, useToast } from '@chakra-ui/react'
import { FaPlayCircle, FaListUl } from 'react-icons/fa'
import { FaCircleArrowDown } from 'react-icons/fa6'
import useAppStateContext from '../hooks/useAppStateContext'
import { SetlistItem, Tab, UGChordCollection } from '../types/tabs'
import { useEffect, useState } from 'react'

export default function TabActionButtons({
  w,
  showBackingTrack,
  setShowBackingTrack,
  showAutoscroll,
  setShowAutoscroll,
  selectedTab,
}: {
  w: string | undefined
  showBackingTrack: boolean
  setShowBackingTrack: React.Dispatch<React.SetStateAction<boolean>>
  showAutoscroll: boolean
  setShowAutoscroll: React.Dispatch<React.SetStateAction<boolean>>
  selectedTab: Tab
}): JSX.Element {
  const { 
    addToSetlist, 
    updateSetlist, 
    setlist, 
    transposeAmount, 
    baseKeyAmount,
    sessionCapo,
    chordLockAmount,
    isSimplified,
    userKey,
    chordEdits,
    extraChords,
    isLiveMode
  } = useAppStateContext()
  const toast = useToast()
  const [hasMounted, setHasMounted] = useState(false)
  const buttonMarginTop = useBreakpointValue({ base: 3, md: 2 })

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isInSetlist = hasMounted && selectedTab && setlist ? setlist.some((item) => item?.tab?.slug === selectedTab.slug) : false

  const handleAction = () => {
    if (!selectedTab) return

    const diagramsToSave = selectedTab.chordsDiagrams

    if (isInSetlist) {
      const existingItem = setlist.find((item) => item.tab.url === selectedTab.url)
      if (existingItem) {
        updateSetlist({
          ...existingItem,
          tab: selectedTab, // Update the tab content too (for offline sync)
          transposeAmount,
          baseKeyAmount,
          sessionCapo,
          chordLockAmount,
          isSimplified,
          userKey,
          chordEdits,
          extraChords,
          chordsDiagrams: diagramsToSave,
        })
      }
      return
    }

    const newItem: SetlistItem = {
      id: Math.random().toString(36).substring(7),
      tab: selectedTab,
      transposeAmount,
      baseKeyAmount,
      sessionCapo,
      chordLockAmount,
      isSimplified,
      userKey: userKey || undefined,
      chordEdits,
      extraChords,
      chordsDiagrams: diagramsToSave,
    }
    addToSetlist(newItem)
  }

  return (
    <Flex pb={1} w={w} pt={0} flexWrap={'wrap'}>
      {!isLiveMode && (
        <Button
          variant="outline"
          _hover={{
            bg: 'blue.400',
            color: 'white',
            opacity: showBackingTrack ? 0.8 : 1,
          }}
          _active={{
            bg: 'fadebp',
            color: 'white',
          }}
          isActive={showBackingTrack}
          onClick={() => {
            setShowBackingTrack((prevState) => !prevState)
          }}
          size={'sm'}
          boxShadow="md"
          fontWeight={'normal'}
          px="3"
          py="4"
          mr={2}
          mt={buttonMarginTop}
          leftIcon={<Icon as={FaPlayCircle} />}
        >
          Backing track
        </Button>
      )}
      {!isLiveMode && (
        <Button
          variant="outline"
          _hover={{
            bg: 'blue.400',
            color: 'white',
            opacity: showAutoscroll ? 0.8 : 1,
          }}
          _active={{
            bg: 'fadebp',
            color: 'white',
          }}
          isActive={showAutoscroll}
          onClick={() => {
            setShowAutoscroll((prevState) => !prevState)
          }}
          size={'sm'}
          boxShadow="md"
          fontWeight={'normal'}
          px="3"
          py="4"
          mt={buttonMarginTop}
          leftIcon={<Icon as={FaCircleArrowDown} />}
        >
          Autoscroll
        </Button>
      )}
      {!isLiveMode && (
        <Button
          variant="outline"
          _hover={{
            bg: 'blue.400',
            color: 'white',
          }}
          _active={{
            bg: 'fadebp',
            color: 'white',
          }}
          onClick={handleAction}
          size={'sm'}
          boxShadow="md"
          fontWeight={'normal'}
          px="3"
          py="4"
          ml={2}
          mt={buttonMarginTop}
          leftIcon={<Icon as={FaListUl} />}
        >
          {isInSetlist ? 'Update Setlist' : 'Add to Setlist'}
        </Button>
      )}
    </Flex>
  )
}
