import { Container, Flex, Box, useColorModeValue } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { ReactNode, useRef } from 'react'
import Backdrop from './Backdrop'
import Footer from './Footer'
import Nav from './Nav'
import SetlistSidebar from './SetlistSidebar'
import useAppStateContext from '../hooks/useAppStateContext'

interface LayoutProps {
  children: ReactNode
}
export default function Layout({ children }: LayoutProps): JSX.Element {
  const { pathname } = useRouter()
  const refBackdrop = useRef<HTMLDivElement>(null)
  const isHomePage = pathname === '/'
  
  const { isLiveMode } = useAppStateContext()
  const bgColor = useColorModeValue('gray.50', 'gray.900')

  return (
    <>
      <Backdrop refBackdrop={refBackdrop} />
      <Box bg={bgColor} minH="100vh">
        <Flex>
          <SetlistSidebar />
          <Box flex={1} minH="100vh" bg={useColorModeValue('white', 'gray.800')}>
            <Flex direction="column" minH="100vh">
              <Nav refBackdrop={refBackdrop} />
              <Flex grow={1} direction={isHomePage ? 'row' : 'column'}>
                {children}
              </Flex>
              {!isLiveMode && <Footer />}
            </Flex>
          </Box>
        </Flex>
      </Box>
    </>
  )
}
