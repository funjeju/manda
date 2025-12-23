"use client";

import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import { Node } from '@/lib/types';
import CellCard from './CellCard';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface Grid3x3Props {
    onNodeClick: (node: Node | any) => void;
}

export default function Grid3x3({ onNodeClick }: Grid3x3Props) {
    const { focusNodeId, getChildrenForNode } = useProjectNodesStore();

    // Layout Order:
    // [1] [2] [3]
    // [4] [0] [5]
    // [6] [7] [8]
    // 0 is Center.
    const gridData = getChildrenForNode(focusNodeId);

    // Map slots 1..8 plus 0(Center) to physical grid indices 0..8
    // Grid indices:
    // 0 1 2
    // 3 4 5
    // 6 7 8
    const visualOrder = [1, 2, 3, 4, 0, 5, 6, 7, 8];

    if (!gridData) return null;

    return (
        <div className="grid grid-cols-3 grid-rows-3 gap-2 sm:gap-4 aspect-square max-w-2xl mx-auto w-full p-2 sm:p-4">
            <AnimatePresence mode="popLayout">
                {visualOrder.map((slotIndex) => {
                    const node = gridData[slotIndex];

                    if (!node) {
                        return (
                            <div key={`missing-${slotIndex}`} className="bg-zinc-900 border border-red-500/20 rounded-xl flex items-center justify-center p-4">
                                <span className="text-xs text-red-500">Error</span>
                            </div>
                        );
                    }

                    return (
                        <motion.div
                            key={node.id}
                            layoutId={node.nodeType !== 'EMPTY' ? node.id : undefined}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className={clsx(
                                "relative",
                                slotIndex === 0 ? "col-span-1 row-span-1" : ""
                            )}
                        >
                            <CellCard
                                node={node}
                                isCenter={slotIndex === 0}
                                onClick={() => onNodeClick(node)}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
