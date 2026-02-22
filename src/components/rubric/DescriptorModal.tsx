import type { Criterion } from '../../types'
import { Modal } from '../ui/Modal'

interface DescriptorModalProps {
  criterion: Criterion
  currentScore?: number | null
  onClose: () => void
}

const LEVEL_COLORS = [
  { bg: '#fca5a5', color: '#7f1d1d' }, // 1
  { bg: '#fdba74', color: '#7c2d12' }, // 2
  { bg: '#fde68a', color: '#78350f' }, // 3
  { bg: '#6ee7b7', color: '#064e3b' }, // 4
  { bg: '#34d399', color: '#064e3b' }, // 5
]

export function DescriptorModal({ criterion, currentScore, onClose }: DescriptorModalProps) {
  return (
    <Modal title={criterion.titleShort} onClose={onClose}>
      {criterion.helpText && (
        <p style={{ color: 'var(--color-text-2)', marginBottom: 'var(--s-4)', fontSize: '0.9375rem' }}>
          {criterion.helpText}
        </p>
      )}
      <div className="descriptor-list">
        {([5, 4, 3, 2, 1] as const).map(level => {
          const { bg, color } = LEVEL_COLORS[level - 1]
          const isCurrent = currentScore === level
          return (
            <div
              key={level}
              className="descriptor-item"
              style={{ border: isCurrent ? `2px solid ${color}` : '2px solid transparent' }}
            >
              <div
                className="descriptor-level"
                style={{ background: bg, color }}
              >
                {level}
              </div>
              <div className="descriptor-text">
                {criterion.descriptors[level]}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
