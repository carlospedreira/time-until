import { Component, signal, computed, effect, inject } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  
  // State management
  protected readonly targetTime = signal<Date | null>(null);
  protected readonly currentTime = signal(new Date());
  protected readonly showTimePicker = signal(true);
  protected readonly toastMessage = signal<string | null>(null);
  protected readonly showToast = signal(false);
  protected readonly showHelp = signal(false);
  
  // Time picker form data - default to current time + 15 minutes
  protected readonly selectedHour = signal(this.getDefaultHour());
  protected readonly selectedMinute = signal(this.getDefaultMinute());
  
  // Computed countdown values
  protected readonly remainingTime = computed(() => {
    const target = this.targetTime();
    const current = this.currentTime();
    
    if (!target) return null;
    
    const diff = target.getTime() - current.getTime();
    
    if (diff <= 0) {
      return null;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, total: diff };
  });
  
  private intervalId?: number;
  private hasProcessedUrlParams = false;
  
  constructor() {
    // Check for URL parameters on initialization
    this.checkUrlParameters();
    
    // Update current time every second
    this.intervalId = window.setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
    
    // Auto-reset when countdown finishes
    effect(() => {
      const remaining = this.remainingTime();
      if (remaining && remaining.total <= 0) {
        setTimeout(() => {
          this.resetToTimePicker();
        }, 1000);
      }
    });
  }
  
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  
  protected startCountdown() {
    if (this.selectedHour() === null || this.selectedMinute() === null) {
      return;
    }
    
    const now = new Date();
    const target = new Date();
    
    target.setHours(this.selectedHour());
    target.setMinutes(this.selectedMinute());
    target.setSeconds(0);
    target.setMilliseconds(0);
    
    // Prevent setting target time in the past
    if (target.getTime() <= now.getTime()) {
      this.showToastMessage('Please select a time that is in the future.');
      return;
    }
    
    this.targetTime.set(target);
    this.showTimePicker.set(false);
  }
  
  
  protected formatTime(value: number): string {
    return value.toString().padStart(2, '0');
  }
  
  protected onHourChange(value: string) {
    const hour = parseInt(value, 10);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      this.selectedHour.set(hour);
    }
  }
  
  protected onMinuteChange(value: string) {
    const minute = parseInt(value, 10);
    if (!isNaN(minute) && minute >= 0 && minute <= 59) {
      this.selectedMinute.set(minute);
    }
  }
  
  protected toggleHelp() {
    this.showHelp.set(!this.showHelp());
  }
  
  protected showToastMessage(message: string) {
    this.toastMessage.set(message);
    this.showToast.set(true);
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      this.showToast.set(false);
      // Clear message after fade out animation
      setTimeout(() => {
        this.toastMessage.set(null);
      }, 300);
    }, 3000);
  }
  
  private getDefaultHour(): number {
    const now = new Date();
    const defaultTime = new Date(now.getTime() + 15 * 60 * 1000); // Add 15 minutes
    return defaultTime.getHours();
  }
  
  private getDefaultMinute(): number {
    const now = new Date();
    const defaultTime = new Date(now.getTime() + 15 * 60 * 1000); // Add 15 minutes
    return defaultTime.getMinutes();
  }
  
  private checkUrlParameters() {
    this.route.queryParams.subscribe(params => {
      // Only process URL params once on initial load, not on subsequent navigation
      if (this.hasProcessedUrlParams) {
        return;
      }
      
      const timeParam = params['time'];
      const hourParam = params['hour'];
      const minuteParam = params['minute'];
      const durationParam = params['duration'];
      
      // Support different URL formats:
      // ?time=14:30 (HH:MM format)
      // ?hour=14&minute=30 (separate parameters)
      // ?hour=14 (hour only with smart minute defaults)
      // ?duration=15 (15 minutes from now)
      
      if (timeParam || hourParam !== undefined || durationParam !== undefined) {
        this.hasProcessedUrlParams = true;
        
        if (durationParam !== undefined) {
          this.parseDurationFromNow(durationParam);
        } else if (timeParam) {
          this.parseTimeString(timeParam);
        } else if (hourParam !== undefined && minuteParam !== undefined) {
          this.parseHourMinute(hourParam, minuteParam);
        } else if (hourParam !== undefined) {
          this.parseHourOnly(hourParam);
        }
      }
    });
  }
  
  private parseTimeString(timeString: string) {
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = timeString.match(timeRegex);
    
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        this.setTargetTimeFromUrl(hour, minute);
      } else {
        this.showToastMessage('Invalid time format in URL. Please use HH:MM format.');
      }
    } else {
      this.showToastMessage('Invalid time format in URL. Please use HH:MM format (e.g., ?time=14:30).');
    }
  }
  
  private parseHourMinute(hourString: string, minuteString: string) {
    const hour = parseInt(hourString, 10);
    const minute = parseInt(minuteString, 10);
    
    if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      this.setTargetTimeFromUrl(hour, minute);
    } else {
      this.showToastMessage('Invalid hour or minute in URL parameters.');
    }
  }
  
  private parseHourOnly(hourString: string) {
    const hour = parseInt(hourString, 10);
    
    if (isNaN(hour) || hour < 0 || hour > 23) {
      this.showToastMessage('Invalid hour in URL parameter.');
      return;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    
    let minute: number;
    
    if (hour === currentHour) {
      // If it's the current hour, use 15 minutes from now
      const defaultTime = new Date(now.getTime() + 15 * 60 * 1000);
      minute = defaultTime.getMinutes();
    } else {
      // If it's a future hour, use 0 minutes (top of the hour)
      minute = 0;
    }
    
    this.setTargetTimeFromUrl(hour, minute);
  }
  
  private parseDurationFromNow(durationString: string) {
    const minutes = parseInt(durationString, 10);
    
    if (isNaN(minutes) || minutes <= 0) {
      this.showToastMessage('Invalid duration value. Please provide a positive number.');
      return;
    }
    
    if (minutes > 1440) { // More than 24 hours
      this.showToastMessage('Duration too large. Maximum is 1440 minutes (24 hours).');
      return;
    }
    
    const now = new Date();
    const target = new Date(now.getTime() + minutes * 60 * 1000);
    
    this.targetTime.set(target);
    this.showTimePicker.set(false);
  }
  
  private setTargetTimeFromUrl(hour: number, minute: number) {
    const now = new Date();
    const target = new Date();
    
    target.setHours(hour);
    target.setMinutes(minute);
    target.setSeconds(0);
    target.setMilliseconds(0);
    
    // If the target time is in the past, set it for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    
    this.targetTime.set(target);
    this.showTimePicker.set(false);
  }
  
  
  protected resetToTimePicker() {
    this.showTimePicker.set(true);
    this.targetTime.set(null);
    
    // Reset form to default values (current time + 15 minutes)
    this.selectedHour.set(this.getDefaultHour());
    this.selectedMinute.set(this.getDefaultMinute());
    
    // Reset the URL params processing flag so new URLs can be processed
    this.hasProcessedUrlParams = false;
    
    // Clear URL parameters only if they were set from URL originally
    if (this.location.path().includes('time=') || this.location.path().includes('hour=') || this.location.path().includes('duration=')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    }
  }
}
