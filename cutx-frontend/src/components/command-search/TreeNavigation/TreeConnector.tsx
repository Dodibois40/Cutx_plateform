'use client';

/**
 * TreeConnector - Proper tree branch connectors
 *
 * Classic tree structure:
 * │
 * ├── Item 1
 * │   ├── Sub-item 1.1
 * │   └── Sub-item 1.2
 * └── Item 2
 *
 * Uses smooth rounded corners for modern look
 */

import { motion } from 'framer-motion';

interface TreeConnectorProps {
  /** Whether this is the last child in the group */
  isLast?: boolean;
  /** Whether the connector should animate */
  isVisible?: boolean;
  /** Delay before animation starts */
  delay?: number;
  /** Indentation level */
  level: number;
}

// Constants
const INDENT_SIZE = 20; // Must match paddingLeft increment in TreeNode
const CONNECTOR_WIDTH = 12; // Horizontal line to node
const LINE_COLOR = 'rgba(251, 191, 36, 0.35)'; // amber-400/35
const LINE_COLOR_SUBTLE = 'rgba(255, 255, 255, 0.08)';

export function TreeConnector({
  isLast = false,
  isVisible = true,
  delay = 0,
  level,
}: TreeConnectorProps) {
  // Position from left edge based on parent's level
  const leftPosition = 20 + (level - 1) * INDENT_SIZE + 6; // 6px offset for centering

  return (
    <div
      className="absolute top-0 bottom-0 left-0 pointer-events-none"
      style={{ width: leftPosition + CONNECTOR_WIDTH + 4 }}
    >
      {/* Vertical line from parent - continues down for non-last items */}
      <motion.div
        className="absolute"
        style={{
          left: leftPosition,
          top: 0,
          bottom: isLast ? '50%' : 0,
          width: 1.5,
          backgroundColor: LINE_COLOR,
          borderRadius: 1,
        }}
        initial={{ scaleY: 0 }}
        animate={isVisible ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{
          duration: 0.25,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        style-origin="top"
      />

      {/* Horizontal line to node with rounded corner */}
      <motion.div
        className="absolute"
        style={{
          left: leftPosition,
          top: '50%',
          width: CONNECTOR_WIDTH,
          height: 1.5,
          backgroundColor: LINE_COLOR,
          borderRadius: '0 2px 2px 0',
          transformOrigin: 'left',
        }}
        initial={{ scaleX: 0 }}
        animate={isVisible ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{
          duration: 0.2,
          delay: delay + 0.1,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      />

      {/* Corner dot for visual polish */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: leftPosition - 1,
          top: 'calc(50% - 1.5px)',
          width: 3,
          height: 3,
          backgroundColor: LINE_COLOR,
        }}
        initial={{ scale: 0 }}
        animate={isVisible ? { scale: 1 } : { scale: 0 }}
        transition={{
          duration: 0.15,
          delay: delay + 0.2,
          ease: [0.34, 1.56, 0.64, 1],
        }}
      />
    </div>
  );
}

/**
 * Vertical continuation line for ancestors
 * Shows the path from root to current node
 */
interface AncestorLineProps {
  level: number;
  isVisible?: boolean;
}

export function AncestorLine({ level, isVisible = true }: AncestorLineProps) {
  const leftPosition = 20 + (level - 1) * INDENT_SIZE + 6;

  return (
    <motion.div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: leftPosition,
        width: 1.5,
        backgroundColor: LINE_COLOR_SUBTLE,
        borderRadius: 1,
      }}
      initial={{ opacity: 0 }}
      animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  );
}
