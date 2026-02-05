"use client";

import * as React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

interface DatePickerProps {
  /** 선택된 날짜 */
  value?: Date;
  /** 날짜 변경 핸들러 */
  onChange: (date: Date | undefined) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 선택 불가능한 날짜 (기본: 오늘 이전) */
  disabledDates?: (date: Date) => boolean;
  /** 최소 선택 가능 날짜 */
  minDate?: Date;
  /** 최대 선택 가능 날짜 */
  maxDate?: Date;
  /** 추가 클래스 */
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  disabled = false,
  disabledDates,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // 기본 비활성화 로직: 오늘 이전 날짜
  const defaultDisabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    return false;
  };

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal touch-target",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, " M월 d일 (E)", { locale: ko })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledDates || defaultDisabledDates}
          locale={ko}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  /** 시작일 */
  startDate?: Date;
  /** 종료일 */
  endDate?: Date;
  /** 시작일 변경 핸들러 */
  onStartDateChange: (date: Date | undefined) => void;
  /** 종료일 변경 핸들러 */
  onEndDateChange: (date: Date | undefined) => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 최대 여행 기간 (일) */
  maxDays?: number;
  /** 시작일 에러 메시지 */
  startDateError?: string;
  /** 종료일 에러 메시지 */
  endDateError?: string;
  /** 추가 클래스 */
  className?: string;
}

/**
 * 여행 기간을 한 번에 선택하는 단일 캘린더.
 * 캘린더에서 시작일·종료일을 범위로 선택한다.
 */
export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  maxDays = 30,
  startDateError,
  endDateError,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const firstClickRef = React.useRef<Date | null>(null);

  const selectedRange: DateRange | undefined =
    startDate != null
      ? { from: startDate, to: endDate }
      : undefined;

  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(
    selectedRange,
  );
  const prevOpenRef = React.useRef(open);

  React.useEffect(() => {
    const wasOpen = prevOpenRef.current;

    if (open && !wasOpen) {
      if (startDate && !endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        firstClickRef.current = start;
        setTempRange(selectedRange);
      } else {
        firstClickRef.current = null;
        setTempRange(startDate && endDate ? undefined : selectedRange);
      }
    }

    if (!open && wasOpen) {
      firstClickRef.current = null;
      setTempRange(selectedRange);
    }

    prevOpenRef.current = open;
  }, [open, startDate, endDate, selectedRange]);

  const handleSelect = (
    range: DateRange | undefined,
    triggerDate?: Date,
  ) => {
    if (!triggerDate) {
      if (range?.from && range.to) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);

        const normalized =
          to.getTime() < from.getTime()
            ? { from: to, to: from }
            : { from, to };

        setTempRange(normalized);
        onStartDateChange(normalized.from);
        onEndDateChange(normalized.to);
        return;
      }

      setTempRange(range);
      onStartDateChange(range?.from);
      onEndDateChange(range?.to);
      return;
    }

    const clickedDay = new Date(triggerDate);
    clickedDay.setHours(0, 0, 0, 0);

    const hasRange = tempRange?.from && tempRange?.to;

    if (!firstClickRef.current || hasRange) {
      const nextRange = { from: clickedDay, to: undefined };
      firstClickRef.current = clickedDay;
      setTempRange(nextRange);
      onStartDateChange(nextRange.from);
      onEndDateChange(undefined);
      return;
    }

    const from = firstClickRef.current;
    const nextRange =
      clickedDay.getTime() < from.getTime()
        ? { from: clickedDay, to: from }
        : { from, to: clickedDay };
    setTempRange(nextRange);
    onStartDateChange(nextRange.from);
    onEndDateChange(nextRange.to);
    firstClickRef.current = null;
    setOpen(false);
  };

  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const disabledMatcher = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < today) return true;
    return false;
  };

  const buttonLabel =
    startDate && endDate
      ? `${format(startDate, "yyyy년 M월 d일", { locale: ko })} ~ ${format(endDate, "M월 d일", { locale: ko })}`
      : "여행 기간 선택";

  const shouldShowError = !(startDate && !endDate);
  const hasError = shouldShowError && !!(startDateError || endDateError);

  const startDateLabel = startDate
    ? format(startDate, "PPP", { locale: ko })
    : "";

  const displayLabel =
    startDate && !endDate && startDateLabel ? startDateLabel : buttonLabel;

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal touch-target",
              !selectedRange?.from && "text-muted-foreground",
              hasError && "border-destructive",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={handleSelect}
            disabled={disabledMatcher}
            max={maxDays}
            locale={ko}
            numberOfMonths={1}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {shouldShowError && (startDateError || endDateError) && (
        <p className="text-sm font-medium text-destructive">
          {startDateError ?? endDateError}
        </p>
      )}
    </div>
  );
}
