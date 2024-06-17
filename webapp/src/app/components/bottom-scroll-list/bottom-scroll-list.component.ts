import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-bottom-scroll-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-scroll-list.component.html',
  styleUrl: './bottom-scroll-list.component.scss',
})
export class BottomScrollListComponent<T> implements AfterViewInit, OnChanges {
  @Input() dataList: T[] = [];
  @Input() itemTemplate!: TemplateRef<unknown>;
  @Input() maxHeight: string = '25em';

  @ViewChild('itemsContainer') private itemsContainer!: ElementRef;
  private isUserScrolling = false;

  ngAfterViewInit() {
    this.scrollToBottom();
    this.itemsContainer.nativeElement.style.maxHeight = this.maxHeight;
  }

  /** Check if the list needs to be scrolled down again when the input list changes */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataList']) {
      this.checkScroll();
    }
  }

  /** Detect if the user is scrolling.
   * When hitting the bottom, assume that the user stopped scrolling.
   */
  onScroll() {
    if (!this.itemsContainer) return;
    const element = this.itemsContainer.nativeElement;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    this.isUserScrolling = !atBottom;
  }

  /** Check if the list needs to be scrolled to the bottom */
  private checkScroll() {
    if (!this.itemsContainer) return;
    const element = this.itemsContainer.nativeElement;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    if (atBottom || !this.isUserScrolling) {
      setTimeout(() => this.scrollToBottom(), 0); // A 0 timeout is needed to wait for the DOM to update
    }
  }

  /** Make the list scroll to the bottom */
  private scrollToBottom(): void {
    try {
      this.itemsContainer.nativeElement.scrollTop = this.itemsContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
