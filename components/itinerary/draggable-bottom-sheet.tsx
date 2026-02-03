"use client";

import * as React from "react";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type SnapPoint = "closed" | "middle" | "open";

interface DraggableBottomSheetProps {
  /** 바텀 시트 내용 */
  children: React.ReactNode;
  /** 초기 스냅 포인트 */
  initialSnapPoint?: SnapPoint;
  /** 스냅 포인트 변경 핸들러 (높이 변경 시 가장 가까운 구간 기준으로 호출, 참고용) */
  onSnapPointChange?: (snapPoint: SnapPoint) => void;
  /** 추가 클래스 */
  className?: string;
}

/** 뷰포트 기준 최소/최대 높이 비율 (0~1) */
const HEIGHT_RATIO = {
  min: 0.05,
  max: 0.85,
} as const;

/** 스냅 포인트별 뷰포트 높이 비율 */
const SNAP_RATIOS: Record<SnapPoint, number> = {
  closed: 0.05,
  middle: 0.35,
  open: 0.7,
};

/**
 * 바텀 시트 컴포넌트
 * - 핸들을 드래그해 높이를 자유롭게 조정 (최소~최대 사이 어디든 유지)
 * - 손을 떼면 그대로 그 높이에 멈춤 (자동 스냅 없음)
 * - 터치·마우스 모두 지원
 */
export function DraggableBottomSheet({
  children,
  initialSnapPoint = "middle",
  onSnapPointChange,
  className,
}: DraggableBottomSheetProps) {
  const [currentHeight, setCurrentHeight] = React.useState(0);
  const [snapPoint, setSnapPoint] = React.useState<SnapPoint>(initialSnapPoint);
  const [isDragging, setIsDragging] = React.useState(false);

  const contentRef = React.useRef<HTMLDivElement>(null);
  const handleRef = React.useRef<HTMLDivElement>(null);
  const dragStartY = React.useRef(0);
  const dragStartHeight = React.useRef(0);

  const getMinHeight = React.useCallback((): number => {
    if (typeof window === "undefined") return 0;
    return window.innerHeight * HEIGHT_RATIO.min;
  }, []);

  const getMaxHeight = React.useCallback((): number => {
    if (typeof window === "undefined") return 0;
    return window.innerHeight * HEIGHT_RATIO.max;
  }, []);

  const getSnapHeight = React.useCallback((point: SnapPoint): number => {
    if (typeof window === "undefined") return 0;
    return window.innerHeight * SNAP_RATIOS[point];
  }, []);

  /** 현재 높이에서 가장 가까운 스냅 포인트 */
  const getNearestSnapPoint = React.useCallback(
    (height: number): SnapPoint => {
      const closedH = getSnapHeight("closed");
      const middleH = getSnapHeight("middle");
      const openH = getSnapHeight("open");

      const toClosed = Math.abs(height - closedH);
      const toMiddle = Math.abs(height - middleH);
      const toOpen = Math.abs(height - openH);

      if (toClosed <= toMiddle && toClosed <= toOpen) return "closed";
      if (toMiddle <= toOpen) return "middle";
      return "open";
    },
    [getSnapHeight],
  );

  const clampHeight = React.useCallback(
    (h: number): number => {
      const min = getMinHeight();
      const max = getMaxHeight();
      return Math.round(Math.min(max, Math.max(min, h)));
    },
    [getMinHeight, getMaxHeight],
  );

  // 초기 높이 설정
  React.useEffect(() => {
    const height = getSnapHeight(initialSnapPoint);
    setCurrentHeight(height);
    setSnapPoint(initialSnapPoint);
  }, [initialSnapPoint, getSnapHeight]);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      handleRef.current?.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartHeight.current = currentHeight;
    },
    [currentHeight],
  );

  const handlePointerMove = React.useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartY.current - e.clientY;
      const nextHeight = clampHeight(dragStartHeight.current + deltaY);
      setCurrentHeight(nextHeight);
    },
    [isDragging, clampHeight],
  );

  const handlePointerUp = React.useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      handleRef.current?.releasePointerCapture?.(e.pointerId);
      setIsDragging(false);
      // 사용자가 놓은 그 높이에 그대로 유지 (스냅 없음)
      const nearest = getNearestSnapPoint(currentHeight);
      setSnapPoint(nearest);
      onSnapPointChange?.(nearest);
    },
    [isDragging, currentHeight, getNearestSnapPoint, onSnapPointChange],
  );

  React.useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-xl shadow-lg",
        "flex flex-col",
        className,
      )}
      style={{ height: `${currentHeight}px` }}
    >
      {/* 드래그 핸들 - 위아래로 당겨 높이 조정 */}
      <div
        ref={handleRef}
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        className={cn(
          "sticky top-0 z-30 flex items-center justify-center py-2 touch-target",
          "select-none cursor-grab active:cursor-grabbing",
          "hover:bg-muted/50 active:bg-muted/70",
          "bg-background border-b border-border/50 shadow-sm",
        )}
        style={{
          minHeight: "44px",
          touchAction: "none",
        }}
        aria-label="시트 높이 조절"
      >
        <GripHorizontal className="w-5 h-5 text-muted-foreground" />
      </div>

      <div ref={contentRef} className="flex-1 overflow-auto min-h-0">
        {children}
      </div>
    </div>
  );
}
