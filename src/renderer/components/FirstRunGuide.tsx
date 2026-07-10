import {
  CheckCircle2,
  FolderPlus,
  Layers3,
  PlayCircle,
  RotateCcw,
  type LucideIcon,
  X,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useState } from 'react'

export type FirstRunGuideStep = 'project' | 'role' | 'open' | 'restore'

type FirstRunGuideProps = {
  step: FirstRunGuideStep
  onAction: () => void
  onDismiss: () => void
}

type GuideStep = {
  id: FirstRunGuideStep
  targetId: string
  title: string
  description: string
  actionLabel: string
  icon: LucideIcon
}

const steps: GuideStep[] = [
  {
    id: 'project',
    targetId: 'new-project',
    title: 'Create a project',
    description: 'Name the app you are testing and add its base URL.',
    actionLabel: 'Create project',
    icon: FolderPlus,
  },
  {
    id: 'role',
    targetId: 'new-role-profile',
    title: 'Add role profiles',
    description: 'Set up Admin, Staff, Customer, or any role you test often.',
    actionLabel: 'Add role',
    icon: Layers3,
  },
  {
    id: 'open',
    targetId: 'open-role-tab',
    title: 'Open role tabs',
    description: 'Launch isolated sessions so each role stays signed in separately.',
    actionLabel: 'Open role tab',
    icon: PlayCircle,
  },
  {
    id: 'restore',
    targetId: 'restore-workspace',
    title: 'Restore your workspace',
    description: 'Keep tabs and role sessions ready for your next testing pass.',
    actionLabel: 'Finish',
    icon: RotateCcw,
  },
]

type TargetRect = {
  height: number
  left: number
  top: number
  width: number
}

export function FirstRunGuide({ step, onAction, onDismiss }: FirstRunGuideProps) {
  const currentStep = steps.find((candidateStep) => candidateStep.id === step) ?? steps[0]
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [windowSize, setWindowSize] = useState(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }))
  const Icon = currentStep.icon
  const stepIndex = steps.findIndex((candidateStep) => candidateStep.id === currentStep.id)

  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${currentStep.targetId}"]`)

    if (!target) {
      setTargetRect(null)
      return undefined
    }

    const measuredTarget = target

    measuredTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })

    function updateTargetRect() {
      const rect = measuredTarget.getBoundingClientRect()
      setTargetRect({
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      })
      setWindowSize({
        height: window.innerHeight,
        width: window.innerWidth,
      })
    }

    updateTargetRect()
    measuredTarget.classList.add('first-run-tour-target')
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)

    return () => {
      measuredTarget.classList.remove('first-run-tour-target')
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [currentStep.targetId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const target = document.querySelector<HTMLElement>(`[data-tour-id="${currentStep.targetId}"]`)

      if (!target) {
        setTargetRect(null)
        return
      }

      const rect = target.getBoundingClientRect()
      setTargetRect({
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      })
    }, 300)

    return () => window.clearInterval(timer)
  }, [currentStep.targetId])

  const highlightStyle = targetRect
    ? {
        height: targetRect.height + 14,
        left: targetRect.left - 7,
        top: targetRect.top - 7,
        width: targetRect.width + 14,
      }
    : undefined
  const popoverStyle = getPopoverStyle(targetRect, windowSize)

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {targetRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl border-2 border-blue-500 bg-blue-500/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.18),0_12px_32px_rgba(37,99,235,0.18)] transition-all duration-300"
          style={highlightStyle}
        />
      ) : null}
      <section
        role="dialog"
        aria-labelledby="first-run-guide-title"
        className="pointer-events-auto fixed w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-300"
        style={popoverStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h2 id="first-run-guide-title" className="mt-1 text-lg font-semibold text-slate-950">
              {currentStep.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{currentStep.description}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Dismiss guide"
            title="Dismiss"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <Icon aria-hidden="true" size={17} />
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {targetRect
              ? 'Use the highlighted control, or choose the action below to continue.'
              : 'Choose the action below to continue. The guide will move to the next control when it appears.'}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CheckCircle2 aria-hidden="true" size={15} className="text-emerald-600" />
            {step === 'restore' ? 'You are ready to test roles.' : 'The guide moves as you complete each step.'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Later
            </button>
            <button
              type="button"
              onClick={onAction}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Icon aria-hidden="true" size={16} />
              {currentStep.actionLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function getPopoverStyle(
  targetRect: TargetRect | null,
  windowSize: { height: number; width: number },
): { left: number; top: number } {
  const margin = 16
  const popoverHeight = 260
  const popoverWidth = 352

  if (!targetRect) {
    return {
      left: Math.max(margin, windowSize.width - popoverWidth - margin),
      top: margin,
    }
  }

  const placeRight = targetRect.left + targetRect.width + popoverWidth + margin * 2 < windowSize.width
  const placeLeft = targetRect.left - popoverWidth - margin > margin
  const left = placeRight
    ? targetRect.left + targetRect.width + margin
    : placeLeft
      ? targetRect.left - popoverWidth - margin
      : Math.min(Math.max(margin, targetRect.left), windowSize.width - popoverWidth - margin)
  const top = Math.min(
    Math.max(margin, targetRect.top + targetRect.height / 2 - popoverHeight / 2),
    windowSize.height - popoverHeight - margin,
  )

  return { left, top }
}
