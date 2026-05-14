'use client'

import { Joyride, type EventData, STATUS, EVENTS, ACTIONS, type Step } from 'react-joyride'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

const BOT_INSTALL_URL =
  'https://discord.com/oauth2/authorize?client_id=1504170895269302386&permissions=139586816064&integration_type=0&scope=bot'

const STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to ResaleWatch 👋',
    content:
      "Let's get your first alert set up. This takes about 2 minutes — we'll walk you through every step.",
    skipBeacon: true,
  },
  {
    target: '[data-tour="new-watch-btn"]',
    title: 'Create your first watch',
    content: 'A watch monitors Vinted and Gumtree for listings that match your search.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="watch-name"]',
    title: 'Name your watch',
    content: 'Give it a memorable name, e.g. "Nike Air Max 90". This shows up in your alerts.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="watch-query"]',
    title: 'What are you looking for?',
    content: "Enter the search term exactly as you'd type it on Vinted or Gumtree.",
    skipBeacon: true,
  },
  {
    target: '[data-tour="watch-source"]',
    title: 'Choose where to scan',
    content: '"Both" checks Vinted and Gumtree simultaneously — recommended for maximum coverage.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="discord-section"]',
    title: 'Connect your Discord',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          The bot needs to be in your Discord server before it can send alerts. It only needs
          <strong> Send Messages</strong> and <strong>Embed Links</strong>.
        </p>
        <a
          href={BOT_INSTALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4752c4]"
        >
          Add bot to Discord →
        </a>
        <p className="text-xs text-zinc-500">Come back here and hit Next once it&apos;s added.</p>
      </div>
    ) as unknown as string,
    skipBeacon: true,
  },
  {
    target: '[data-tour="discord-channel"]',
    title: 'Pick your alert channel',
    content:
      'Select which Discord channel receives the alerts. Reload the page if your server just appeared.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="watch-submit"]',
    title: "You're all set! 🎉",
    content: 'Hit Create Watch and your watch goes live immediately. Alerts start on the next scan.',
    skipBeacon: true,
  },
]

// Steps 0-1 belong to /dashboard/watches, steps 2-7 to /dashboard/watches/new
const PAGE_START: Record<string, number> = {
  '/dashboard/watches': 0,
  '/dashboard/watches/new': 2,
}

interface Props {
  tourDone: boolean
  watchCount: number
  workspaceId: string
  markTourDone: () => Promise<void>
}

export default function OnboardingTour({ tourDone, watchCount, markTourDone }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  // Auto-start for new users on the watches page
  useEffect(() => {
    if (tourDone || watchCount > 0) return
    if (pathname === '/dashboard/watches') {
      setStepIndex(0)
      setRun(true)
    }
  }, [tourDone, watchCount, pathname])

  // Resume mid-tour when landing on /new (step index was set to 2 before navigation)
  useEffect(() => {
    if (!run) return
    if (pathname === '/dashboard/watches/new' && stepIndex === 2) {
      // small delay to let the page mount
      const t = setTimeout(() => setRun(true), 300)
      return () => clearTimeout(t)
    }
  }, [pathname, run, stepIndex])

  const handleEvent = useCallback(
    async (data: EventData) => {
      const { action, index, status, type } = data

      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        const next = index + (action === ACTIONS.PREV ? -1 : 1)

        // After step 1, navigate to the new watch form
        if (index === 1 && action === ACTIONS.NEXT) {
          setRun(false)
          setStepIndex(2)
          router.push('/dashboard/watches/new')
          return
        }

        setStepIndex(next)
      }

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false)
        await markTourDone()
      }
    },
    [router, markTourDone],
  )

  const pageStart = PAGE_START[pathname]
  if (pageStart === undefined || !run) return null

  // Slice out only the steps for the current page
  const pageEnd = pageStart === 0 ? 2 : STEPS.length
  const visibleSteps = STEPS.slice(pageStart, pageEnd)
  const localIndex = Math.max(0, stepIndex - pageStart)

  return (
    <Joyride
      steps={visibleSteps}
      stepIndex={localIndex}
      run={run}
      continuous
      onEvent={handleEvent}
      styles={{
        tooltip: { borderRadius: 12, padding: '16px 20px' },
        buttonPrimary: {
          backgroundColor: '#14b8a6',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
        },
        buttonBack: { borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#71717a' },
        buttonSkip: { fontSize: 12, color: '#a1a1aa' },
      }}
      locale={{ back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip tour' }}
    />
  )
}
