import {
  Box,
  VStack,
  Text,
  Flex,
  IconButton,
  Heading,
  Divider,
  HStack,
  Badge,
  useColorModeValue,
  Tooltip,
  Button,
  Icon,
} from '@chakra-ui/react'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  DeleteIcon,
  DownloadIcon,
  UpDownIcon,
} from '@chakra-ui/icons'
import useAppStateContext from '../hooks/useAppStateContext'
import { useRouter } from 'next/router'
import { FaMusic, FaFileExport, FaFileImport } from 'react-icons/fa'
import { useRef, useState, useEffect } from 'react'
import { SetlistItem } from '../types/tabs'

export default function SetlistSidebar() {
  const {
    setlist,
    removeFromSetlist,
    reorderSetlist,
    setTransposeAmount,
    setBaseKeyAmount,
    exportSetlist,
    importSetlist,
    setIsSimplified,
    setUserKey,
    setSessionCapo,
    setChordLockAmount,
    isLiveMode
  } = useAppStateContext()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const hoverBg = useColorModeValue('blue.50', 'whiteAlpha.100')

  const handleSelectSong = (item: any) => {
    // Restore performance settings
    setTransposeAmount(item.transposeAmount)
    setBaseKeyAmount(item.baseKeyAmount)
    setSessionCapo(item.sessionCapo || null)
    setChordLockAmount(item.chordLockAmount || null)
    setIsSimplified(item.isSimplified || false)
    setUserKey(item.userKey || null)
    // Navigate to the tab
    router.push(`/tab?slug=${item.tab.slug}`)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importSetlist(file)
    }
  }

  const parseCapo = (capoStr: any): number => {
    if (!capoStr) return 0
    if (typeof capoStr === 'number') return capoStr
    const str = String(capoStr).toLowerCase()
    if (str.includes('no capo')) return 0
    const match = str.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  const getDynamicCapoLabel = (item: SetlistItem) => {
    const originalCapo = parseCapo(item.tab.capo)
    const currentTranspose = item.transposeAmount || 0
    
    if (item.baseKeyAmount === null || item.baseKeyAmount === undefined) {
      const effectiveCapo = typeof item.sessionCapo === 'number' ? item.sessionCapo : originalCapo
      return effectiveCapo === 0 ? 'NO CAPO' : `CAPO ${effectiveCapo}`
    }
    
    // Locked Mode: Capo = baseKeyAmount + originalCapo - transposeAmount
    const delta = (item.baseKeyAmount || 0) + originalCapo - currentTranspose
    const normalizedFret = ((delta % 12) + 12) % 12
    return normalizedFret === 0 ? 'NO CAPO' : `CAPO ${normalizedFret}`
  }

  return (
    <Box
      w="280px"
      borderRight="1px"
      borderColor={borderColor}
      bg={useColorModeValue('gray.50', 'gray.900')}
      h="100vh"
      display={{ base: 'none', lg: 'block' }}
      position="sticky"
      top="0"
    >
      <Flex direction="column" h="full">
        <Box p={4} flex={1} overflowY="auto">
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="xs" color="blue.500" display="flex" alignItems="center" letterSpacing="widest">
              <FaMusic style={{ marginRight: '8px' }} /> SETLIST ({hasMounted ? setlist.length : 0})
            </Heading>
          </Flex>
          <Divider mb={4} />

          {(!hasMounted || setlist.length === 0) ? (
            <Text fontSize="xs" color="gray.400" fontStyle="italic">
              {!hasMounted ? 'Loading...' : 'Your setlist is empty. Add songs to get started!'}
            </Text>
          ) : (
            <VStack spacing={3} align="stretch">
              {setlist.map((item, index) => (
                <Box
                  key={item.id}
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  _hover={{ bg: hoverBg, cursor: 'pointer', borderColor: 'blue.300' }}
                  transition="all 0.2s"
                  onClick={() => handleSelectSong(item)}
                  position="relative"
                  role="group"
                >
                  <Flex justifyContent="space-between" align="start">
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                        {item.tab.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        {item.tab.artist}
                      </Text>
                      <HStack mt={1} spacing={1}>
                        <Badge colorScheme="blue" variant="subtle" fontSize="2xs">
                          {getDynamicCapoLabel(item)}
                        </Badge>
                      </HStack>
                    </VStack>
                    
                    <Flex 
                      flexDirection="column" 
                      opacity={0} 
                      _groupHover={{ opacity: 1 }} 
                      transition="opacity 0.2s"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HStack spacing={1}>
                          <Tooltip label="Move up">
                              <IconButton
                                  aria-label="Move up"
                                  icon={<ChevronUpIcon />}
                                  size="2xs"
                                  variant="ghost"
                                  isDisabled={index === 0}
                                  onClick={() => reorderSetlist(index, index - 1)}
                              />
                          </Tooltip>
                          <Tooltip label="Move down">
                              <IconButton
                                  aria-label="Move down"
                                  icon={<ChevronDownIcon />}
                                  size="2xs"
                                  variant="ghost"
                                  isDisabled={index === setlist.length - 1}
                                  onClick={() => reorderSetlist(index, index + 1)}
                              />
                          </Tooltip>
                          <Tooltip label={isLiveMode ? "Can't delete in Live Mode" : "Remove"}>
                              <IconButton
                                  aria-label="Remove"
                                  icon={<DeleteIcon />}
                                  size="2xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  isDisabled={isLiveMode}
                                  onClick={() => removeFromSetlist(item.id)}
                              />
                          </Tooltip>
                      </HStack>
                    </Flex>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

        <Box p={4} borderTop="1px" borderColor={borderColor}>
          <HStack spacing={2}>
            <Button
              size="xs"
              variant="outline"
              leftIcon={<Icon as={FaFileExport} />}
              onClick={exportSetlist}
              flex={1}
            >
              Export
            </Button>
            <Button
              size="xs"
              variant="outline"
              leftIcon={<Icon as={FaFileImport} />}
              onClick={handleImportClick}
              flex={1}
            >
              Import
            </Button>
          </HStack>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleFileChange}
          />
        </Box>
      </Flex>
    </Box>
  )
}
