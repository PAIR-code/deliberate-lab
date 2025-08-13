import {makeObservable} from 'mobx';
import {FirebaseService} from './firebase.service';
import {ParticipantService} from './participant.service';
import {addBehaviorEventsCallable} from '../shared/callables';
import {Service} from './service';

interface ServiceProvider {
  firebaseService: FirebaseService;
  participantService: ParticipantService;
}

/** Collects client interaction events and sends in small batches. */
export class BehaviorService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  private experimentId: string | null = null;
  private participantPrivateId: string | null = null;
  private buffer: {
    eventType: string;
    relativeTimestamp: number;
    stageId: string;
    metadata: Record<string, unknown>;
  }[] = [];
  private maxBufferSize = 50;
  private flushIntervalMs = 5000;
  private intervalHandle: number | null = null;
  private listenersAttached = false;
  private lastValueMap: WeakMap<HTMLElement, string> = new WeakMap();
  private inputSubscriptions: Set<() => void> = new Set();

  start(experimentId: string, participantPrivateId: string) {
    // Ignore if already tracking same participant
    if (
      this.experimentId === experimentId &&
      this.participantPrivateId === participantPrivateId &&
      this.listenersAttached
    ) {
      return;
    }
    this.stop();
    this.experimentId = experimentId;
    this.participantPrivateId = participantPrivateId;
    this.attachListeners();
    // Periodic flush
    this.intervalHandle = window.setInterval(
      () => this.flush(),
      this.flushIntervalMs,
    );
    // Flush when page hidden/unloaded
    document.addEventListener('visibilitychange', this.onVisibilityChange, {
      capture: true,
    });
    window.addEventListener('beforeunload', this.onBeforeUnload, {
      capture: true,
    });
  }

  stop() {
    if (this.listenersAttached) {
      document.removeEventListener('click', this.onClick, true);
      document.removeEventListener('keydown', this.onKeyDown, true);
      document.removeEventListener('copy', this.onCopy, true);
      document.removeEventListener('paste', this.onPaste, true);
      window.removeEventListener('blur', this.onWindowBlur, true);
      window.removeEventListener('focus', this.onWindowFocus, true);
      this.listenersAttached = false;
    }
    document.removeEventListener(
      'visibilitychange',
      this.onVisibilityChange,
      true,
    );
    window.removeEventListener('beforeunload', this.onBeforeUnload, true);
    if (this.intervalHandle) {
      window.clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    // Tear down any per-field input subscriptions
    for (const unsub of this.inputSubscriptions) {
      unsub();
    }
    this.inputSubscriptions.clear();
    // Do not flush after clearing identifiers
    void this.flush();
    this.experimentId = null;
    this.participantPrivateId = null;
    this.buffer = [];
  }

  /** Manually log a custom behavior event. */
  log(eventType: string, metadata: Record<string, unknown> = {}) {
    const stageId =
      this.sp.participantService.currentStageViewId ??
      this.sp.participantService.profile?.currentStageId ??
      'unknown';
    const evt = {
      eventType,
      relativeTimestamp: performance.now(),
      stageId,
      metadata,
    };
    this.buffer.push(evt);
    if (this.buffer.length >= this.maxBufferSize) {
      void this.flush();
    }
  }

  // Internal
  private attachListeners() {
    if (this.listenersAttached) return;
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('copy', this.onCopy, true);
    document.addEventListener('paste', this.onPaste, true);
    window.addEventListener('blur', this.onWindowBlur, true);
    window.addEventListener('focus', this.onWindowFocus, true);
    this.listenersAttached = true;
  }

  private onClick = (e: MouseEvent) => {
    // Keep minimal metadata; avoid PII
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName || '';
    const id = target?.id || '';
    const cls = target?.className?.toString?.().slice(0, 200) || '';
    this.log('click', {
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      isTrusted: e.isTrusted,
      targetTag: tag,
      targetId: id,
      targetClass: cls,
    });
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Do not capture actual key values; only log whether it was backspace/delete
    const keyName = (e.key || '').toLowerCase();
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.metaKey) modifiers.push('meta');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    this.log('keydown', {
      keyName,
      modifiers,
      repeat: e.repeat,
      isTrusted: e.isTrusted,
      targetTag: (e.target as HTMLElement | null)?.tagName || '',
    });
  };

  private onCopy = (e: ClipboardEvent) => {
    // Try to capture the actual copied text safely
    let text = '';
    const active = document.activeElement as HTMLElement | null;
    // If copying from an input or textarea, use selection range
    if (
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
    ) {
      const el = active as HTMLInputElement | HTMLTextAreaElement;
      if (
        typeof el.selectionStart === 'number' &&
        typeof el.selectionEnd === 'number'
      ) {
        text = el.value.substring(el.selectionStart, el.selectionEnd);
      }
    }
    // Otherwise, use the document selection
    if (!text) {
      text = document.getSelection()?.toString() ?? '';
    }

    const MAX_COPY_LEN = 10000;
    const truncated = text.length > MAX_COPY_LEN;
    const storedText = truncated ? text.slice(0, MAX_COPY_LEN) : text;

    this.log('copy', {
      text: storedText,
      length: text.length,
      truncated,
      isTrusted: e.isTrusted,
      targetTag: active?.tagName || '',
      contentEditable: !!active?.isContentEditable,
    });
  };

  private onPaste = (e: ClipboardEvent) => {
    // Read pasted text from clipboard data (covers keyboard, menu, context menu)
    let text = '';
    if (e.clipboardData) {
      text = e.clipboardData.getData('text/plain') || '';
    }

    // Cap length to avoid huge payloads
    const MAX_PASTE_LEN = 10000;
    const truncated = text.length > MAX_PASTE_LEN;
    const storedText = truncated ? text.slice(0, MAX_PASTE_LEN) : text;

    const active = document.activeElement as HTMLElement | null;
    this.log('paste', {
      text: storedText,
      length: text.length,
      truncated,
      isTrusted: e.isTrusted,
      targetTag: active?.tagName || '',
      contentEditable: !!active?.isContentEditable,
    });
  };

  // used for searching in shadow dom for the actual text input element
  private isAllowedTextInput(
    el: Element,
  ): el is HTMLInputElement | HTMLTextAreaElement {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const input = el as HTMLInputElement;
      const type = (input.type || 'text').toLowerCase();
      // Exclude password fields; allow common text types
      return (
        type !== 'password' &&
        ['text', 'search', 'url', 'email', 'tel', 'number'].includes(type)
      );
    }
    return false;
  }

  private getValue(el: HTMLInputElement | HTMLTextAreaElement): string {
    return el.value ?? '';
  }

  private computeDiff(oldVal: string, newVal: string) {
    // Simple diff: longest common prefix/suffix
    let start = 0;
    const oldLen = oldVal.length;
    const newLen = newVal.length;
    while (
      start < oldLen &&
      start < newLen &&
      oldVal[start] === newVal[start]
    ) {
      start++;
    }
    let end = 0;
    while (
      end < oldLen - start &&
      end < newLen - start &&
      oldVal[oldLen - 1 - end] === newVal[newLen - 1 - end]
    ) {
      end++;
    }
    const deletedText = oldVal.slice(start, oldLen - end);
    const addedText = newVal.slice(start, newLen - end);
    return {addedText, deletedText, start, end};
  }

  // change events intentionally not tracked; per-input granularity only

  /**
   * Attach input tracking to a specific text field host element.
   * Works with native inputs/textareas and custom elements like pr-textarea.
   * Returns an unsubscribe function to remove the listener.
   */
  public attachTextInput(target: Element, fieldId: string): () => void {
    const handler = (e: Event) => {
      // Minimal resolution: prefer target itself, then its shadow root, then light DOM descendants
      let el: HTMLInputElement | HTMLTextAreaElement | null = null;
      if (this.isAllowedTextInput(target)) {
        el = target as HTMLInputElement | HTMLTextAreaElement;
      } else {
        const sr = target.shadowRoot as ShadowRoot | undefined;
        if (sr) {
          const candidate = sr.querySelector('textarea, input');
          if (candidate && this.isAllowedTextInput(candidate)) {
            el = candidate as HTMLInputElement | HTMLTextAreaElement;
          }
        }
        if (!el && (target as Element).querySelector) {
          const candidate = (target as Element).querySelector(
            'textarea, input',
          );
          if (candidate && this.isAllowedTextInput(candidate)) {
            el = candidate as HTMLInputElement | HTMLTextAreaElement;
          }
        }
      }
      if (!el) return;

      const newVal = this.getValue(el);
      const oldVal = this.lastValueMap.get(el) ?? '';
      const {addedText, deletedText, start} = this.computeDiff(oldVal, newVal);

      if (!addedText && !deletedText) return;

      const ie = e as unknown as InputEvent;
      const inputType = ie?.inputType || 'unknown';
      const data = ie?.data ?? null;
      const isComposing = ie?.isComposing === true;

      const selStart =
        (el as HTMLInputElement | HTMLTextAreaElement).selectionStart ?? null;
      const selEnd =
        (el as HTMLInputElement | HTMLTextAreaElement).selectionEnd ?? null;

      const MAX_DELTA_LEN = 10000;
      const addedTrunc = addedText.length > MAX_DELTA_LEN;
      const deletedTrunc = deletedText.length > MAX_DELTA_LEN;

      this.log('text_change', {
        domEvent: 'input',
        fieldId,
        inputType,
        data: typeof data === 'string' ? data.slice(0, MAX_DELTA_LEN) : data,
        isComposing,
        addedText: addedTrunc ? addedText.slice(0, MAX_DELTA_LEN) : addedText,
        deletedText: deletedTrunc
          ? deletedText.slice(0, MAX_DELTA_LEN)
          : deletedText,
        diffStart: start,
        oldLength: oldVal.length,
        newLength: newVal.length,
        selectionStart: selStart,
        selectionEnd: selEnd,
        isTrusted: e.isTrusted,
        targetTag: el.tagName,
        inputTypeAttr: (el as HTMLInputElement).type || 'text',
      });

      this.lastValueMap.set(el, newVal);
    };

    // Listen to both input (in case event composes) and custom change emitted by pr-textarea
    target.addEventListener('input', handler, {capture: true});
    target.addEventListener('change', handler, {capture: true});

    const unsubscribe = () => {
      target.removeEventListener('input', handler, true);
      target.removeEventListener('change', handler, true);
    };
    this.inputSubscriptions.add(unsubscribe);
    return () => {
      unsubscribe();
      this.inputSubscriptions.delete(unsubscribe);
    };
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void this.flush();
    }
  };

  private onBeforeUnload = () => {
    void this.flush();
  };

  // Public flush for callers that need to ensure the buffer is persisted now
  public async flush() {
    if (!this.experimentId || !this.participantPrivateId) return;
    if (this.buffer.length === 0) return;
    const events = this.buffer.slice();
    this.buffer = [];
    const payload = {
      experimentId: this.experimentId,
      participantId: this.participantPrivateId,
      events,
    };
    try {
      await addBehaviorEventsCallable(
        this.sp.firebaseService.functions,
        payload,
      );
    } catch (_) {
      // re-queue on failure (cap size to avoid growth)
      this.buffer = events.concat(this.buffer).slice(-200);
    }
  }

  private onWindowBlur = () => {
    this.log('window_blur', {
      visibility: document.visibilityState,
      hasFocus: document.hasFocus(),
    });
  };

  private onWindowFocus = () => {
    this.log('window_focus', {
      visibility: document.visibilityState,
      hasFocus: document.hasFocus(),
    });
  };
}
