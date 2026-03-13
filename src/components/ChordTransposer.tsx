import { AddIcon, MinusIcon, CheckIcon, RepeatIcon } from '@chakra-ui/icons'
import { Badge, Flex, Icon, IconButton, Text, Button, Tooltip } from '@chakra-ui/react'
import { useEffect } from 'react'
import useChordTransposer from '../hooks/useChordTransposer'
import { HiArrowsUpDown } from 'react-icons/hi2'
import { FaMagic } from 'react-icons/fa'
import { UGChordCollection } from '../types/tabs'
import useAppStateContext from '../hooks/useAppStateContext'

interface ChordTransposerProps {
  chords: UGChordCollection
  setChords: Function
  originalCapo?: number | string
  audibleKey?: string
}

export default function ChordTransposer({
  chords,
  setChords,
  originalCapo = 0,
  audibleKey,
}: ChordTransposerProps): JSX.Element {
  const { 
    transposeAmount, 
    setTransposeAmount, 
    baseKeyAmount, 
    setBaseKeyAmount,
    sessionCapo,
    chordLockAmount,
    setChordLockAmount,
    isSimplified,
    setIsSimplified
  } = useAppStateContext()
  
  const { data: chordsTransposed } = useChordTransposer(Object.keys(chords), transposeAmount)

  const transposeChord = (chord: string, amount: number) => {
    var scale = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ]
    return chord.replace(/[CDEFGAB]#?/g, function (match) {
      const i = (scale.indexOf(match) + amount) % scale.length
      return scale[i < 0 ? i + scale.length : i]
    })
  }

  const handleClickTranspose = (amount: number) => {
    setTransposeAmount((prevVal) => prevVal + amount)

    setChords((prevVal: UGChordCollection) => {
      let newVal = {}
      Object.keys(prevVal).forEach((key) => {
        const newKey = transposeChord(key, amount)
        newVal[newKey] = prevVal[key]
      })
      return newVal
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

  const handleSetBaseKey = () => {
    // Current audibleKey = playedKey + effectiveCapo.
    // effectiveCapo is sessionCapo (if set) OR originalCapo.
    const originalCapoOffset = parseCapo(originalCapo)
    const effectiveCapo = sessionCapo !== null ? sessionCapo : originalCapoOffset
    
    // 1. Lock the audible sound integer
    const soundLockedAmount = transposeAmount + effectiveCapo - originalCapoOffset
    setBaseKeyAmount(soundLockedAmount)

    // 2. Lock the physical chord transposition for UI display
    setChordLockAmount(transposeAmount)
  }

  const handleResetBaseKey = () => {
    setBaseKeyAmount(null)
    setChordLockAmount(null)
  }

  useEffect(() => {
    if (chordsTransposed && Object.keys(chordsTransposed).length > 0) {
      setChords(chordsTransposed)
    }
  }, [chordsTransposed, setChords])

  return (
    <Flex display={'flex'} fontSize={'sm'} alignItems={'center'} flexWrap="wrap">
      <Flex alignItems="center" mr={4} mb={2}>
        <Text color={'gray.500'} as="b" mr={1}>
          Transpose
        </Text>
        <Icon boxSize={5} as={HiArrowsUpDown} mr={1} />
        <IconButton
          variant="outline"
          _hover={{
            bg: 'blue.400',
            color: 'white',
          }}
          size={'sm'}
          boxShadow="md"
          fontWeight={'normal'}
          px="3"
          py="4"
          onClick={() => handleClickTranspose(-1)}
          aria-label="Transpose down"
          icon={<MinusIcon />}
        />
        <Badge mx={2} variant="subtle" fontSize={'sm'} color={'blue.400'}>
          {typeof chordLockAmount === 'number' ? transposeAmount - chordLockAmount : transposeAmount}
        </Badge>
        <IconButton
          variant="outline"
          _hover={{
            bg: 'blue.400',
            color: 'white',
          }}
          size={'sm'}
          boxShadow="md"
          fontWeight={'normal'}
          px="3"
          py="4"
          onClick={() => handleClickTranspose(1)}
          aria-label="Transpose up"
          icon={<AddIcon />}
        />
      </Flex>

      <Flex alignItems="center" mr={4} mb={2}>
        {baseKeyAmount === null ? (
          <Tooltip label="Set current transposition as the base key for capo calculation">
            <Button
              size="xs"
              leftIcon={<CheckIcon />}
              onClick={handleSetBaseKey}
              variant="ghost"
              colorScheme="blue"
            >
              Set Base Key
            </Button>
          </Tooltip>
        ) : (
          <Flex alignItems="center">
            <Badge colorScheme="green" mr={2}>
              Base Key Set ({audibleKey || (typeof chordLockAmount === 'number' ? (chordLockAmount >= 0 ? `+${chordLockAmount}` : chordLockAmount) : (typeof baseKeyAmount === 'number' ? (baseKeyAmount >= 0 ? `+${baseKeyAmount}` : baseKeyAmount) : 'Set'))})
            </Badge>
            <Tooltip label="Reset base key reference">
              <IconButton
                size="xs"
                icon={<RepeatIcon />}
                onClick={handleResetBaseKey}
                variant="ghost"
                aria-label="Reset base key"
              />
            </Tooltip>
          </Flex>
        )}
      </Flex>

      <Flex alignItems="center" mb={2}>
        <Tooltip label="Simplify complex chords to basic major/minor forms and filter redundancy">
          <Button
            size="xs"
            variant={isSimplified ? 'solid' : 'outline'}
            colorScheme={isSimplified ? 'blue' : 'gray'}
            leftIcon={<Icon as={FaMagic} />}
            onClick={() => setIsSimplified(!isSimplified)}
          >
            Simplify
          </Button>
        </Tooltip>
      </Flex>
    </Flex>
  )
}
