import { useQuery } from 'react-query'
export const getChordTransposer = async (
  keyChords: string[],
  transposeAmount: number,
  signal: AbortSignal,
): Promise<any> => {
  const urlParams = new URLSearchParams()
  keyChords.forEach((chord) => {
    urlParams.set(chord, chord)
  })
  urlParams.set('transpose', transposeAmount.toString())
  
  const response = await fetch(
    `${window.location.origin}/api/transpose?${urlParams.toString()}`,
    { signal },
  )
  let data = await response.json()
  // No need for pop() if we fix the API to return the clean object
  return data || {}
}

export default function useChordTransposer(keyChords: string[], transposeAmount: number) {
  return useQuery(
    ['getChordTransposer', keyChords, transposeAmount],
    async ({ signal }) => getChordTransposer(keyChords, transposeAmount, signal),
    {
      enabled: keyChords && keyChords.length > 0 && transposeAmount !== 0,
      staleTime: Infinity, // These don't change for a given song/transpose combo
    },
  )
}
