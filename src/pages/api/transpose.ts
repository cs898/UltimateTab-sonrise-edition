import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handlerTranspose(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const queryChords = req.query as Record<string, string>
  const queryTransposeUG = new URLSearchParams(queryChords)
  if (queryChords) {
    queryTransposeUG.set('appl_api_version', '2')
    queryTransposeUG.set('custom', '0')
    queryTransposeUG.set('instr', 'guitar')
    queryTransposeUG.set('json', '1')
    queryTransposeUG.set('tuning', 'E A D G B E')

    const transposedChords = await fetch(
      `https://tabs.ultimate-guitar.com/tab/applicature/transpose?${queryTransposeUG.toString()}`,
      {
        headers: {
          Referer: 'https://tabs.ultimate-guitar.com/',
          Accept: 'application/json',
        },
      },
    )
    try {
      const resultTransposedChords = await transposedChords.json()
      const applicature = resultTransposedChords?.info?.applicature
      
      if (applicature) {
        let objStructModified: any = {}
        
        if (Array.isArray(applicature)) {
          // If it's an array, it might be [{ "G": [...] }, ...] or [{ "chord": "G", "variations": [...] }, ...]
          applicature.forEach((item: any) => {
            if (item.chord && item.variations) {
              objStructModified[item.chord] = item.variations
            } else {
              Object.assign(objStructModified, item)
            }
          })
        } else {
          // It's already a map of { "G": [...], "C": [...] }
          Object.keys(applicature).forEach((key) => {
            // UG sometimes wraps the variations in another object, we want just the array
            const val = applicature[key]
            objStructModified[key] = Array.isArray(val) ? val : Object.values(val)
          })
        }
        res.status(200).json(objStructModified)
      } else {
        res.status(200).json({})
      }
    } catch (e) {
      console.error('Transpose API Error:', e)
      res.status(200).json({})
    }
  } else {
    res.status(200).json({})
  }
}
