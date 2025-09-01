import { Component, signal, computed, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // State management
  protected readonly targetTime = signal<Date | null>(null);
  protected readonly currentTime = signal(new Date());
  protected readonly showTimePicker = signal(true);
  
  // Time picker form data
  protected readonly selectedHour = signal(new Date().getHours());
  protected readonly selectedMinute = signal(0);
  
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
  
  constructor() {
    // Update current time every second
    this.intervalId = window.setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
    
    // Auto-reset when countdown finishes
    effect(() => {
      const remaining = this.remainingTime();
      if (remaining && remaining.total <= 0) {
        setTimeout(() => {
          this.showTimePicker.set(true);
          this.targetTime.set(null);
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
    
    // If the target time is earlier than current time, set it for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
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
}
