"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "./input";

interface TimePickerDemoProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export function TimePickerDemo({
  value,
  onChange,
  className,
}: TimePickerDemoProps) {
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const [hour, setHour] = React.useState<number>(
    value ? parseInt(value.split(":")[0]) : 9
  );
  const [minute, setMinute] = React.useState<number>(
    value ? parseInt(value.split(":")[1]) : 0
  );
  const [open, setOpen] = React.useState(false);

  // Update the time string when hour or minute changes
  React.useEffect(() => {
    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    onChange(timeString);
  }, [hour, minute, onChange]);

  // Update hour and minute when value changes
  React.useEffect(() => {
    if (value) {
      const [hourStr, minuteStr] = value.split(":");
      setHour(parseInt(hourStr));
      setMinute(parseInt(minuteStr));
    }
  }, [value]);

  const handleHourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newHour = parseInt(event.target.value);
    if (newHour >= 0 && newHour <= 23) {
      setHour(newHour);
    }
  };

  const handleMinuteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMinute = parseInt(event.target.value);
    if (newMinute >= 0 && newMinute <= 59) {
      setMinute(newMinute);
    }
  };

  const handleHourIncrement = () => {
    setHour((prevHour) => (prevHour === 23 ? 0 : prevHour + 1));
  };

  const handleHourDecrement = () => {
    setHour((prevHour) => (prevHour === 0 ? 23 : prevHour - 1));
  };

  const handleMinuteIncrement = () => {
    const newMinute = minute + 15;
    setMinute(newMinute > 59 ? 0 : newMinute);

    if (newMinute > 59) {
      handleHourIncrement();
    }
  };

  const handleMinuteDecrement = () => {
    const newMinute = minute - 15;
    setMinute(newMinute < 0 ? 45 : newMinute);

    if (newMinute < 0) {
      handleHourDecrement();
    }
  };

  const setTimeQuickly = (newHour: number, newMinute: number) => {
    setHour(newHour);
    setMinute(newMinute);
  };

  const quickTimeOptions = [
    { label: "9:00 AM", hour: 9, minute: 0 },
    { label: "12:00 PM", hour: 12, minute: 0 },
    { label: "3:00 PM", hour: 15, minute: 0 },
    { label: "6:00 PM", hour: 18, minute: 0 },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal w-full",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || "Select time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center gap-2">
            <div className="grid gap-1 text-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleHourIncrement}
              >
                <span className="sr-only">Increase hour</span>
                <i className="h-4 w-4">▲</i>
              </Button>
              <Input
                ref={hourRef}
                type="number"
                value={hour.toString().padStart(2, "0")}
                onChange={handleHourChange}
                className="h-10 w-12 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleHourDecrement}
              >
                <span className="sr-only">Decrease hour</span>
                <i className="h-4 w-4">▼</i>
              </Button>
            </div>
            <div className="text-xl font-bold">:</div>
            <div className="grid gap-1 text-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleMinuteIncrement}
              >
                <span className="sr-only">Increase minute</span>
                <i className="h-4 w-4">▲</i>
              </Button>
              <Input
                ref={minuteRef}
                type="number"
                value={minute.toString().padStart(2, "0")}
                onChange={handleMinuteChange}
                className="h-10 w-12 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleMinuteDecrement}
              >
                <span className="sr-only">Decrease minute</span>
                <i className="h-4 w-4">▼</i>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {quickTimeOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                className="text-xs"
                onClick={() => setTimeQuickly(option.hour, option.minute)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            Select Time
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
