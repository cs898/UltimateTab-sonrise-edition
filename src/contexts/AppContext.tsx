import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, MouseEventHandler, SetStateAction, Dispatch } from 'react'
import { useToast } from '@chakra-ui/react'
import { TAB_SOURCES } from '../constants'
import useBackgroundTabs from '../hooks/useBackgroundTabs'
import useWindowSize from '../hooks/useWindowSize'
import useLocalStorage from '../hooks/useLocalStorage'
import useTabs from '../hooks/useTabs'
import useTabsList from '../hooks/useTabsList'
import { ApiResponseSearch, SetlistItem, Tab } from '../types/tabs'

interface AppState {
  searchValue: string
  setSearchValue: Dispatch<SetStateAction<string>>
  searchType: string
  setSearchType: Dispatch<SetStateAction<string>>
  searchSource: string
  setSearchSource: Dispatch<SetStateAction<string>>
  currentPage: number
  setCurrentPage: Dispatch<SetStateAction<number>>
  favorites: Tab[]
  setFavorites: Dispatch<SetStateAction<Tab[]>>
  selectedTab: Tab
  setSelectedTab: Dispatch<SetStateAction<Tab>>
  tabFontSize: number
  setTabFontSize: Dispatch<SetStateAction<number>>
  isLoadingTab: boolean
  widthBrowser: number
  selectedTabContent: Tab
  isLoadingTabBackground: boolean
  selectedTabContentBackground: Tab
  handleClickFavorite: MouseEventHandler<HTMLButtonElement>
  favoriteActive: boolean
  setFavoriteActive: Dispatch<SetStateAction<boolean>>
  refetchTab: Function
  isLoadingTabList: boolean
  isErrorTabList: boolean
  dataTabList: ApiResponseSearch
  transposeAmount: number
  setTransposeAmount: Dispatch<SetStateAction<number>>
  baseKeyAmount: number | null
  setBaseKeyAmount: Dispatch<SetStateAction<number | null>>
  setlist: SetlistItem[]
  setSetlist: Dispatch<SetStateAction<SetlistItem[]>>
  addToSetlist: (item: SetlistItem) => void
  removeFromSetlist: (id: string) => void
  updateSetlist: (item: SetlistItem) => void
  reorderSetlist: (startIndex: number, endIndex: number) => void
  exportSetlist: () => void
  importSetlist: (file: File) => Promise<void>
  isSimplified: boolean
  setIsSimplified: Dispatch<SetStateAction<boolean>>
  userKey: string | null
  setUserKey: Dispatch<SetStateAction<string | null>>
  sessionCapo: number | null
  setSessionCapo: Dispatch<SetStateAction<number | null>>
  chordLockAmount: number | null
  setChordLockAmount: Dispatch<SetStateAction<number | null>>
  chordEdits: Record<number, { name?: string, offset?: number }>
  setChordEdits: React.Dispatch<React.SetStateAction<Record<number, {name?: string, offset?: number}>>>
  extraChords: Record<string, any>
  setExtraChords: React.Dispatch<React.SetStateAction<Record<string, any>>>
  isLiveMode: boolean
  setIsLiveMode: React.Dispatch<React.SetStateAction<boolean>>
  resetSongState: () => void
  showAutoscroll: boolean
  setShowAutoscroll: React.Dispatch<React.SetStateAction<boolean>>
}
export const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }) {
  const [searchValue, setSearchValue] = useState<string>('')
  const [searchType, setSearchType] = useState<string>('All')
  const [searchSource, setSearchSource] = useState<string>(
    Object.values(TAB_SOURCES).join(','),
  )
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [favorites, setFavorites] = useLocalStorage<Tab[]>('favoriteTabs', [])
  const [favoriteActive, setFavoriteActive] = useState<boolean>(false)
  const [selectedTab, setSelectedTab] = useState<Tab>({
    url: '',
    slug: '',
    name: '',
    artist: '',
    numberRates: 0,
    rating: 0,
    type: 'Tab',
  })
  const [tabFontSize, setTabFontSize] = useLocalStorage<number>(
    'tabFontSize',
    100,
  )
  const [widthBrowser, heightBrowser] = useWindowSize()
  const [transposeAmount, setTransposeAmount] = useState<number>(0)
  const [baseKeyAmount, setBaseKeyAmount] = useState<number | null>(null)
  const [sessionCapo, setSessionCapo] = useState<number | null>(null)
  const [chordLockAmount, setChordLockAmount] = useState<number | null>(null)
  const [chordEdits, setChordEdits] = useState<Record<number, { name?: string, offset?: number }>>({})
  const [extraChords, setExtraChords] = useState<Record<string, any>>({})
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false)
  const [showAutoscroll, setShowAutoscroll] = useState<boolean>(false)

  const resetSongState = useCallback(() => {
    setTransposeAmount(0)
    setBaseKeyAmount(null)
    setSessionCapo(null)
    setChordLockAmount(null)
    setUserKey(null)
    setChordEdits({})
    // We do NOT reset extraChords anymore - it's our session-wide Global Library
  }, [])
  const [setlist, setSetlist] = useLocalStorage<SetlistItem[]>('setlist', [])

  const toast = useToast()
  const cachedTab = setlist.find((item) => item.tab.url === selectedTab.url)?.tab

  const {
    isLoading: isLoadingTab,
    data: selectedTabContent,
    refetch: refetchTab,
  } = useTabs(selectedTab.url, tabFontSize, widthBrowser, cachedTab)

  const {
    isLoading: isLoadingTabBackground,
    data: selectedTabContentBackground,
  } = useBackgroundTabs(selectedTab.url, tabFontSize, widthBrowser)

  const {
    isLoading: isLoadingTabList,
    isError: isErrorTabList,
    data: dataTabList,
  } = useTabsList(
    searchValue,
    searchType,
    currentPage,
    searchSource,
    favoriteActive,
  )
  const [isSimplified, setIsSimplified] = useState<boolean>(false)
  const [userKey, setUserKey] = useState<string | null>(null)

  const handleClickFavorite: MouseEventHandler<HTMLButtonElement> = () => {
    const indexEntry = favorites.findIndex((el) => el.url === selectedTab.url)
    let newFavorites = favorites
    let isAdded: boolean
    if (indexEntry !== -1) {
      newFavorites.splice(indexEntry, 1)
      isAdded = false
    } else {
      newFavorites.push(selectedTabContent)
      isAdded = true
    }
    setFavorites([...newFavorites])
    toast({
      description: isAdded
        ? 'Song added to your favorites'
        : 'Song removed from your favorites',
      status: isAdded ? 'success' : 'info',
      position: 'top-right',
      duration: 2000,
    })
  }

  const addToSetlist = (item: SetlistItem) => {
    setSetlist((prev) => [...prev, item])
    toast({
      description: 'Added to setlist',
      status: 'success',
      position: 'top-right',
      duration: 2000,
    })
  }

  const removeFromSetlist = (id: string) => {
    setSetlist((prev) => prev.filter((item) => item.id !== id))
  }

  const updateSetlist = (item: SetlistItem) => {
    setSetlist((prev) =>
      prev.map((i) => (i.tab.slug === item.tab.slug ? item : i)),
    )
    toast({
      description: 'Setlist updated',
      status: 'success',
      position: 'top-right',
      duration: 2000,
    })
  }

  const reorderSetlist = (startIndex: number, endIndex: number) => {
    setSetlist((prev) => {
      const result = Array.from(prev)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)
      return result
    })
  }

  const exportSetlist = async () => {
    const dataStr = JSON.stringify(setlist, null, 2)
    const exportFileDefaultName = `ultimate-tab-setlist-${new Date().toISOString().split('T')[0]}.json`

    // Detect Tauri environment
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__

    if (isTauri) {
      console.log('Tauri environment detected, attempting native export...')
      try {
        const { save } = await import('@tauri-apps/plugin-dialog')
        const { writeTextFile } = await import('@tauri-apps/plugin-fs')
        
        const path = await save({
          defaultPath: exportFileDefaultName,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
        
        if (path) {
          await writeTextFile(path, dataStr)
          toast({
            description: 'Setlist exported successfully to system',
            status: 'success',
            position: 'top-right',
            duration: 3000,
          })
        }
      } catch (err) {
        console.error('Tauri native export failed:', err)
        toast({
          description: `Native export failed, trying browser fallback: ${err instanceof Error ? err.message : String(err)}`,
          status: 'warning',
          position: 'top-right',
          duration: 5000,
        })
        
        // Browser fallback
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', url)
        linkElement.setAttribute('download', exportFileDefaultName)
        document.body.appendChild(linkElement)
        linkElement.click()
        document.body.removeChild(linkElement)
        URL.revokeObjectURL(url)
      }
    } else {
      console.log('Browser environment detected, using link download...')
      // Standard browser download
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', url)
      linkElement.setAttribute('download', exportFileDefaultName)
      document.body.appendChild(linkElement)
      linkElement.click()
      document.body.removeChild(linkElement)
      URL.revokeObjectURL(url)
    }
  }

  const importSetlist = async (file: File) => {
    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      if (Array.isArray(imported)) {
        setSetlist(imported)
        toast({
          description: 'Setlist imported successfully',
          status: 'success',
          position: 'top-right',
          duration: 3000,
        })
      }
    } catch (err) {
      toast({
        description: 'Failed to import setlist',
        status: 'error',
        position: 'top-right',
        duration: 3000,
      })
    }
  }

  useEffect(() => {
    if (selectedTab?.url) {
      const setlistItem = setlist.find((item) => item.tab.url === selectedTab.url)
      
      setUserKey(setlistItem?.userKey ?? null)
      setTransposeAmount(setlistItem?.transposeAmount ?? 0)
      setBaseKeyAmount(setlistItem?.baseKeyAmount ?? null)
      setSessionCapo(setlistItem?.sessionCapo ?? null)
      setChordLockAmount(setlistItem?.chordLockAmount ?? null)
      setIsSimplified(setlistItem?.isSimplified ?? false)
      setChordEdits(setlistItem?.chordEdits ?? {})
      // No need to restore extraChords from item; we use the session-wide library
    }
  }, [selectedTab?.url]) // Only run on URL change

  // Global Diagram Library Sync: 
  // Automatically merge diagrams from newly loaded tabs into our global session-wide cache
  useEffect(() => {
    if (selectedTabContent?.chordsDiagrams && Object.keys(selectedTabContent.chordsDiagrams).length > 0) {
      setExtraChords(prev => ({
        ...prev,
        ...selectedTabContent.chordsDiagrams
      }))
    }
  }, [selectedTabContent?.chordsDiagrams])

  return (
    <AppStateContext.Provider
      value={{
        searchValue,
        setSearchValue,
        searchType,
        setSearchType,
        searchSource,
        setSearchSource,
        currentPage,
        setCurrentPage,
        favorites,
        setFavorites,
        selectedTab,
        setSelectedTab,
        tabFontSize,
        setTabFontSize,
        isLoadingTab,
        selectedTabContent,
        isLoadingTabBackground,
        widthBrowser,
        selectedTabContentBackground,
        handleClickFavorite,
        favoriteActive,
        setFavoriteActive,
        refetchTab,
        isLoadingTabList,
        isErrorTabList,
        dataTabList,
        transposeAmount,
        setTransposeAmount,
        baseKeyAmount,
        setBaseKeyAmount,
        setlist,
        setSetlist,
        addToSetlist,
        removeFromSetlist,
        updateSetlist,
        reorderSetlist,
        exportSetlist,
        importSetlist,
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
        extraChords,
        setExtraChords,
        isLiveMode,
        setIsLiveMode,
        resetSongState,
        showAutoscroll,
        setShowAutoscroll,
      }}
    >
      {children}
    </AppStateContext.Provider>
  )
}
