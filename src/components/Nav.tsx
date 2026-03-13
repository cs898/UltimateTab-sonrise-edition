import {
  Box,
  Flex,
  Button,
  Stack,
  useColorMode,
  useColorModeValue,
  Text,
  Link,
  useBreakpointValue,
  Switch,
  Icon,
} from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md'
import NextLink from 'next/link'
import { useEffect, useState, MutableRefObject } from 'react'
import AutocompleteInput from './AutocompleteInput'
import useAppStateContext from '../hooks/useAppStateContext'
import FontSizeManager from './FontSizeManager'
import { FaCircleArrowDown } from 'react-icons/fa6'
export default function Nav({
  refBackdrop,
}: {
  refBackdrop: MutableRefObject<HTMLDivElement>
}): JSX.Element {
  const { colorMode, toggleColorMode } = useColorMode()
  const titleHeader = useBreakpointValue({ base: 'Ut', md: 'Ultimate tab' })
  const navBgLive = useColorModeValue('gray.100', 'gray.900')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { isLiveMode, setIsLiveMode, showAutoscroll, setShowAutoscroll } = useAppStateContext()

  const toggleFullscreen = async () => {
    try {
      // @ts-ignore
      if (window.__TAURI__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrentWindow()
        const fullscreen = await currentWindow.isFullscreen()
        await currentWindow.setFullscreen(!fullscreen)
        setIsFullscreen(!fullscreen)
      } else {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen()
          setIsFullscreen(true)
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen()
            setIsFullscreen(false)
          }
        }
      }
    } catch (e) {
      console.error('Fullscreen toggle failed:', e)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <>
      <Box px={4} bg={isLiveMode ? navBgLive : 'transparent'}>
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
          <Flex alignItems={'center'}>
            <Link as={NextLink} href="/" style={{ textDecoration: 'none' }}>
              <Text
                bg="fadebp"
                bgClip="text"
                fontSize={useBreakpointValue({ base: 'xl', md: 'xl' })}
                mr={4}
                fontWeight="extrabold"
                whiteSpace={'nowrap'}
                display={isLiveMode ? 'none' : 'block'}
              >
                {titleHeader}
              </Text>
            </Link>
            {isLiveMode && (
              <FontSizeManager w="auto" mt={0} pt={0} />
            )}
          </Flex>
          <Flex alignItems={'center'} width={'100%'} display={isLiveMode ? 'none' : 'flex'}>
            <AutocompleteInput refBackdrop={refBackdrop} />
          </Flex>
          
          <Flex alignItems={'center'}>
            <Stack direction={'row'} spacing={3} alignItems="center">
              {isLiveMode && (
               <Button
                variant="outline"
                _hover={{
                  bg: 'blue.400',
                  color: 'white',
                  opacity: showAutoscroll ? 0.8 : 1,
                }}
                _active={{ bg: 'fadebp', color: 'white' }}
                isActive={showAutoscroll}
                onClick={() => setShowAutoscroll((prev) => !prev)}
                size="sm"
                boxShadow="md"
                fontWeight="normal"
                px="3"
                py="4"
                leftIcon={<Icon as={FaCircleArrowDown} />}
              >
                Autoscroll
              </Button>
              )}
              <Flex alignItems="center" mr={2} display={{ base: 'none', md: 'flex' }}>
                <Text fontSize="sm" fontWeight={isLiveMode ? "bold" : "normal"} color={isLiveMode ? "blue.400" : "gray.500"} mr={2}>
                  Live Mode
                </Text>
                <Switch 
                  colorScheme="blue" 
                  isChecked={isLiveMode} 
                  onChange={(e) => setIsLiveMode(e.target.checked)} 
                />
              </Flex>
              <Button
                size={useBreakpointValue({ base: 'sm', md: 'md' })}
                onClick={toggleFullscreen}
                variant="ghost"
              >
                {isFullscreen ? (
                  <MdFullscreenExit size={24} />
                ) : (
                  <MdFullscreen size={24} />
                )}
              </Button>
              <Button
                size={useBreakpointValue({ base: 'sm', md: 'md' })}
                onClick={toggleColorMode}
              >
                {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              </Button>
            </Stack>
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
