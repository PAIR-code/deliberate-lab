import '../../pair-components/button';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {APP_NAME} from '../../shared/constants';

import {styles} from './login.scss';

/** Login page component */
@customElement('login-page')
export class Login extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);

  @state() experimentId = '';
  @state() participantId = '';

  // For the text animation.
  @state() private phraseIndex = 0;
  @state() private fadeClass = '';
  private _interval: number | null = null;

  private phrases = [
    'run human–AI social experiments.',
    'simulate group behavior with AI agents.',
    'facilitate live group discussions.',
    'build real-time interactive agents.',
    'prototype interactive social systems.',
  ];

  connectedCallback() {
    super.connectedCallback();
    this._interval = window.setInterval(() => {
      this.fadeClass = 'fade-out';
      window.setTimeout(() => {
        this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length;
        this.fadeClass = 'fade-in';
      }, 400);
    }, 4000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval !== null) {
      window.clearInterval(this._interval);
    }
  }

  override render() {
    const handleLogin = () => {
      this.analyticsService.trackButtonClick(ButtonClick.LOGIN);
      this.authService.signInWithGoogle();
    };

    // TODO: Replace the form with custom URL for other deployments.
    return html`
      <div class="login">
        <header class="header">
          <div class="logo">🕊️ ${APP_NAME}</div>
          <div class="header-actions">
            <pr-button
              variant="tonal"
              @click=${() =>
                window.open('https://forms.gle/K87ACqV3H5mwPUoN8', '_blank')}
            >
              Apply to run experiments
            </pr-button>
            <pr-button @click=${handleLogin}> Sign in </pr-button>
          </div>
        </header>

        <div class="login-content">
          <h1 class="hero-title">
            On Deliberate Lab, you can 
            <span class="rotating-wrapper">
            <span class="rotating-term ${this.fadeClass}">
              ${this.phrases[this.phraseIndex]}
            </span>
          </h1>
          <p class="hero-subhead">
            ${APP_NAME} is
            <a
              href="https://pair-code.github.io/deliberate-lab/"
              target="_blank"
              >an experimental open-source platform</a
            >
            for conducting online research on human + LLM group dynamics. It is
            managed by Google DeepMind's
            <a href="https://pair.withgoogle.com/" target="_blank">PAIR</a>
            team.
          </p>
          <img
            src="https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/hero.png"
            alt="Platform preview"
          />

          <div class="info">
            <div>
              ⚠️ The administrators of this deployment have access to any
              experiment data created. Contact the owner(s) for information
              about analytics tracking and data retention policies. To run the
              platform locally or create your own deployment,
              <a
                href="https://github.com/PAIR-code/deliberate-lab"
                target="_blank"
              >
                clone ${APP_NAME} on GitHub</a
              >.
            </div>
          </div>
        </div>

        <footer>
          <div class="footer-container">
            <div class="footer-links">
              <a
                href="https://github.com/PAIR-code/deliberate-lab"
                target="_blank"
                rel="noopener"
                >GitHub</a
              >
              <a
                href="https://arxiv.org/abs/2510.13011"
                target="_blank"
                rel="noopener"
                >Technical Paper</a
              >
              <a
                href="https://github.com/PAIR-code/deliberate-lab/issues/new"
                target="_blank"
                rel="noopener"
                >Contact</a
              >
            </div>

            <div class="version">
              Version:
              <a
                href="https://github.com/PAIR-code/llm-mediation-experiments/commit/${GIT_COMMIT_HASH}"
                target="_blank"
                >${GIT_VERSION}</a
              >
            </div>
          </div>
        </footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'login-page': Login;
  }
}
