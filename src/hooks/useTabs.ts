import { useQuery } from 'react-query'
import { ApiResponseTab, Tab } from '../types/tabs'
export const getDatasTab = async (
  url: string,
  fontSize: number,
  widthBrowser: number,
  signal: AbortSignal,
): Promise<Tab> => {
  const response = await fetch(
    `/api/tab?q=${url}&width=${Math.ceil(
      widthBrowser * (1 - (fontSize - 100) / 100),
    )}&height=${Math.ceil(
      document.documentElement.clientHeight * (1 - (fontSize - 100) / 100),
    )}`,
    { signal },
  )
  const parsedResponse: ApiResponseTab = await response.json()
  return parsedResponse.tab
}
export default function useTabs(
  url: string,
  fontSize: number = 100,
  widthBrowser: number,
  initialData?: Tab,
) {
  return useQuery(
    ['getTab', url],
    async ({ signal }) => getDatasTab(url, fontSize, widthBrowser, signal),
    {
      enabled: url.length > 0,
      initialData: initialData,
      // If we have initialData (cached), only consider it complete if it has diagrams too
      staleTime: (initialData?.htmlTab && initialData?.chordsDiagrams) ? Infinity : 0,
    },
  )
}
