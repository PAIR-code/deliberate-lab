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
    const isBackspace = keyName === 'backspace';
    const isDelete = keyName === 'delete' || keyName === 'del';
    this.log('keydown', {
      isBackspace,
      isDelete,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
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
