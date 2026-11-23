/**
 * ============================================================================
 * LLMVerse — Main Interactive Laboratory Controller (js/app.js)
 * ============================================================================
 * Connects every interactive section of LLMVerse:
 *   - Responsive Navbar & Scroll-Active Highlighting
 *   - Lab 01: Tokenizer Lab (live chips, unique IDs, inspector, presets, copy)
 *   - Lab 02: Embeddings Lab (simulated vectors, bipolar bar chart, cosine comparator)
 *   - Lab 03: Interactive 3D Universe (controls, add sentence, point telemetry)
 *   - Lab 04: Custom Explorer (full tokenization + per-token & sentence vectors + send to 3D)
 *   - Lab 05: Animated 7-Stage LLM Pipeline (clickable stages + live visualizations + auto-play)
 */

(function () {
  'use strict';

  const Engine = window.LLMVerseEngine;
  const Universe = window.LLMVerseUniverse;

  // Shared state for pipeline live trace text
  let pipelineSampleText = 'AI explores cosmic language';
  let currentPipelineStage = 0;
  let pipelineAutoTimer = null;

  /* --------------------------------------------------------------------------
   * UTILITY HELPERS
   * -------------------------------------------------------------------------- */
  let toastTimeout = null;
  function showToast(message) {
    const toast = document.getElementById('cosmic-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function copyToClipboard(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(`Copied ${label} to clipboard`),
        () => showToast(`Unable to copy ${label}`)
      );
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(`Copied ${label} to clipboard`);
    }
  }

  /**
   * Renders bipolar positive/negative glowing bars for any numerical vector.
   */
  function renderVectorBars(container, vector, onHoverDimension) {
    container.innerHTML = '';
    const maxAbs = Math.max(0.35, ...vector.map((v) => Math.abs(v)));

    vector.forEach((val, idx) => {
      const col = document.createElement('div');
      col.className = 'vbar-col';

      const pct = Math.max(6, (Math.abs(val) / maxAbs) * 46);
      const fill = document.createElement('div');
      fill.className = 'vbar-fill ' + (val >= 0 ? 'positive' : 'negative');
      fill.style.height = pct + '%';

      const axisName = Engine.DIMENSION_LABELS[idx % Engine.DIMENSION_LABELS.length];
      col.title = `d${idx + 1} (${axisName}): ${val >= 0 ? '+' : ''}${val.toFixed(4)}`;

      if (typeof onHoverDimension === 'function') {
        col.addEventListener('mouseenter', () => onHoverDimension(idx, val, axisName));
      }

      col.appendChild(fill);
      container.appendChild(col);
    });
  }

  /* --------------------------------------------------------------------------
   * NAVIGATION BAR & MOBILE MENU
   * -------------------------------------------------------------------------- */
  function initNavigation() {
    const navbar = document.getElementById('navbar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    const links = Array.from(document.querySelectorAll('.nav-link'));
    const sections = links
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (mobileBtn && navLinks) {
      mobileBtn.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', String(isOpen));
      });

      links.forEach((l) => {
        l.addEventListener('click', () => {
          navLinks.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    window.addEventListener('scroll', () => {
      if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 24);
      }

      const scrollPos = window.scrollY + 140;
      sections.forEach((sec, idx) => {
        const top = sec.offsetTop;
        const bottom = top + sec.offsetHeight;
        if (scrollPos >= top && scrollPos < bottom) {
          links.forEach((l) => l.classList.remove('active'));
          links[idx].classList.add('active');
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
   * LAB 01: TOKENIZER LAB
   * -------------------------------------------------------------------------- */
  function initTokenizerLab() {
    const input = document.getElementById('tokenizer-input');
    const tokenizeBtn = document.getElementById('tokenize-btn');
    const chipsBox = document.getElementById('token-chips-container');
    const idsBox = document.getElementById('token-ids-array');
    const inspector = document.getElementById('token-inspector');
    const copyBtn = document.getElementById('copy-token-ids-btn');

    const statCount = document.getElementById('stat-token-count');
    const statUnique = document.getElementById('stat-unique-count');
    const statChars = document.getElementById('stat-char-count');
    const statRatio = document.getElementById('stat-ratio');

    let latestIdsText = '[]';

    function inspectToken(tok, chipEl) {
      chipsBox.querySelectorAll('.token-chip').forEach((c) => c.classList.remove('selected'));
      chipEl.classList.add('selected');

      const kindLabels = {
        word: 'Complete Word Token',
        prefix: 'Subword Prefix Piece',
        subword: 'Subword Stem Piece',
        suffix: 'Subword Suffix Piece (## indicates continuation)',
        number: 'Numeric Token Chunk',
        punctuation: 'Punctuation / Symbol Token'
      };

      inspector.innerHTML = `
        <span class="inspector-title">Inspecting Token #${tok.index + 1}</span>
        <p class="inspector-body">
          <strong>Text:</strong> <code>${escapeHtml(tok.text)}</code> &nbsp;·&nbsp;
          <strong>Token ID:</strong> <span class="text-cyan">${tok.id}</span> &nbsp;·&nbsp;
          <strong>Type:</strong> ${kindLabels[tok.kind] || tok.kind} (${tok.charLength} chars)
        </p>
      `;
    }

    function runTokenizer() {
      const text = input.value;
      const tokens = Engine.tokenize(text);

      // Update summary stats
      const uniqueIds = new Set(tokens.map((t) => t.id)).size;
      const charCount = text.length;
      const ratio = tokens.length > 0 ? (charCount / tokens.length).toFixed(1) : '0.0';

      statCount.textContent = tokens.length;
      statUnique.textContent = uniqueIds;
      statChars.textContent = charCount;
      statRatio.textContent = ratio;

      // Render token chips
      chipsBox.innerHTML = '';
      if (tokens.length === 0) {
        chipsBox.innerHTML = '<span class="panel-hint">Type a sentence above to see its colorful tokens and unique IDs.</span>';
        idsBox.textContent = '[]';
        latestIdsText = '[]';
        return;
      }

      tokens.forEach((tok, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `token-chip tok-c${tok.colorIndex}`;
        chip.style.animationDelay = Math.min(idx * 22, 320) + 'ms';
        chip.innerHTML = `<span>${escapeHtml(tok.text)}</span><span class="token-id-tag">#${tok.id}</span>`;
        chip.addEventListener('click', () => inspectToken(tok, chip));
        chipsBox.appendChild(chip);

        if (idx === 0) {
          inspectToken(tok, chip);
        }
      });

      latestIdsText = '[' + tokens.map((t) => t.id).join(', ') + ']';
      idsBox.textContent = latestIdsText;
    }

    tokenizeBtn.addEventListener('click', runTokenizer);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runTokenizer();
    });

    document.querySelectorAll('[data-tokenizer-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        input.value = btn.getAttribute('data-tokenizer-preset');
        runTokenizer();
      });
    });

    copyBtn.addEventListener('click', () => copyToClipboard(latestIdsText, 'Token IDs'));

    runTokenizer();
  }

  /* --------------------------------------------------------------------------
   * LAB 02: EMBEDDINGS LAB & COSINE SIMILARITY COMPARATOR
   * -------------------------------------------------------------------------- */
  function initEmbeddingsLab() {
    const wordInput = document.getElementById('embedding-word-input');
    const dimSelect = document.getElementById('embedding-dim-select');
    const encodeBtn = document.getElementById('generate-embedding-btn');
    const dimBadge = document.getElementById('embedding-dim-badge');

    const termDisplay = document.getElementById('embed-term-display');
    const dimsDisplay = document.getElementById('embed-dims-display');
    const normDisplay = document.getElementById('embed-norm-display');
    const clusterDisplay = document.getElementById('embed-cluster-display');

    const barsBox = document.getElementById('embedding-bars');
    const dimTooltip = document.getElementById('embedding-dim-tooltip');
    const rawArrayBox = document.getElementById('embedding-raw-array');
    const copyVecBtn = document.getElementById('copy-vector-btn');

    let latestVectorStr = '[]';

    function runEmbedding() {
      const term = wordInput.value.trim() || 'galaxy';
      const dims = parseInt(dimSelect.value, 10) || 16;
      const result = Engine.embedText(term, dims);

      dimBadge.textContent = `${dims} DIMENSIONS (SIMULATED)`;
      termDisplay.textContent = `"${result.text}"`;
      dimsDisplay.textContent = String(result.dimensions);
      normDisplay.textContent = result.norm.toFixed(3);
      clusterDisplay.textContent = result.clusterName;

      renderVectorBars(barsBox, result.vector, (idx, val, axisName) => {
        const sign = val >= 0 ? '+' : '';
        dimTooltip.innerHTML = `<strong>Dimension d${idx + 1}</strong> · Educational Concept Axis: <span class="text-cyan">${axisName}</span> · Simulated Value: <span class="${val >= 0 ? 'vec-num-pos' : 'vec-num-neg'}">${sign}${val.toFixed(4)}</span>`;
      });

      latestVectorStr = '[' + result.vector.map((v) => (v >= 0 ? ' ' : '') + v.toFixed(4)).join(', ') + ']';
      rawArrayBox.textContent = latestVectorStr;
    }

    encodeBtn.addEventListener('click', runEmbedding);
    dimSelect.addEventListener('change', runEmbedding);
    wordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runEmbedding();
    });

    document.querySelectorAll('[data-embed-word]').forEach((btn) => {
      btn.addEventListener('click', () => {
        wordInput.value = btn.getAttribute('data-embed-word');
        runEmbedding();
      });
    });

    copyVecBtn.addEventListener('click', () => copyToClipboard(latestVectorStr, 'Simulated Vector'));

    // Cosine Similarity Comparator
    const wordAInput = document.getElementById('compare-word-a');
    const wordBInput = document.getElementById('compare-word-b');
    const compareBtn = document.getElementById('compare-words-btn');
    const simScoreEl = document.getElementById('similarity-score');
    const simBarEl = document.getElementById('similarity-bar-fill');
    const simVerdictEl = document.getElementById('similarity-verdict');

    function runComparison() {
      const a = wordAInput.value.trim() || 'galaxy';
      const b = wordBInput.value.trim() || 'cosmos';
      const vecA = Engine.embedText(a, 16).vector;
      const vecB = Engine.embedText(b, 16).vector;
      const sim = Engine.cosineSimilarity(vecA, vecB);
      const pct = Math.max(4, Math.min(100, Math.round(((sim + 1) / 2) * 100)));

      simScoreEl.textContent = sim.toFixed(2);
      simBarEl.style.width = pct + '%';

      if (sim >= 0.72) {
        simVerdictEl.textContent = `Strong alignment! "${a}" and "${b}" live in the same simulated semantic neighborhood.`;
      } else if (sim >= 0.35) {
        simVerdictEl.textContent = `Moderate relationship — "${a}" and "${b}" share some conceptual overlap in this demo space.`;
      } else {
        simVerdictEl.textContent = `Distant concepts — "${a}" and "${b}" point in different directions in simulated vector space.`;
      }
    }

    compareBtn.addEventListener('click', runComparison);
    wordAInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runComparison(); });
    wordBInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runComparison(); });

    document.querySelectorAll('[data-pair]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [wA, wB] = btn.getAttribute('data-pair').split('|');
        wordAInput.value = wA;
        wordBInput.value = wB;
        runComparison();
      });
    });

    runEmbedding();
    runComparison();
  }

  /* --------------------------------------------------------------------------
   * LAB 03: INTERACTIVE 3D UNIVERSE CONTROLLER
   * -------------------------------------------------------------------------- */
  function initUniverseControls() {
    const clusterEl = document.getElementById('u-point-cluster');
    const sentenceEl = document.getElementById('u-point-sentence');
    const xEl = document.getElementById('u-coord-x');
    const yEl = document.getElementById('u-coord-y');
    const zEl = document.getElementById('u-coord-z');
    const vecEl = document.getElementById('u-point-vector');
    const neighborListEl = document.getElementById('u-neighbor-list');
    const totalPointsEl = document.getElementById('u-total-points');

    function handleNodeSelected(nodeObj, neighbors, totalCount) {
      clusterEl.textContent = nodeObj.isCustom ? `Custom · ${nodeObj.embed.clusterName}` : nodeObj.embed.clusterName;
      sentenceEl.textContent = `"${nodeObj.text}"`;
      xEl.textContent = nodeObj.pos3D.x.toFixed(2);
      yEl.textContent = nodeObj.pos3D.y.toFixed(2);
      zEl.textContent = nodeObj.pos3D.z.toFixed(2);

      const preview8 = nodeObj.embed.vector.slice(0, 8).map((v) => v.toFixed(3)).join(', ');
      vecEl.textContent = `[${preview8}, …]`;
      totalPointsEl.textContent = `${totalCount} sentences plotted`;

      neighborListEl.innerHTML = '';
      neighbors.forEach((n) => {
        const li = document.createElement('li');
        li.className = 'neighbor-item';
        li.innerHTML = `
          <span class="neighbor-text">${escapeHtml(n.node.text)}</span>
          <span class="neighbor-score">${n.similarity.toFixed(2)}</span>
        `;
        li.addEventListener('click', () => Universe.selectNode(n.node, true));
        neighborListEl.appendChild(li);
      });
    }

    Universe.init(handleNodeSelected);

    const addInput = document.getElementById('universe-sentence-input');
    const addBtn = document.getElementById('universe-add-btn');

    function addCustomSentenceToUniverse() {
      const text = addInput.value.trim();
      if (!text) {
        showToast('Enter a sentence to plot in the 3D universe');
        addInput.focus();
        return;
      }
      Universe.addSentence(text, true, true);
      addInput.value = '';
      showToast('Plotted your sentence as a glowing star in 3D space!');
    }

    addBtn.addEventListener('click', addCustomSentenceToUniverse);
    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCustomSentenceToUniverse();
    });

    const orbitBtn = document.getElementById('toggle-orbit-btn');
    const labelsBtn = document.getElementById('toggle-labels-btn');
    const linksBtn = document.getElementById('toggle-links-btn');

    orbitBtn.addEventListener('click', () => {
      const state = Universe.toggleAutoOrbit();
      orbitBtn.classList.toggle('active', state);
    });

    labelsBtn.addEventListener('click', () => {
      const state = Universe.toggleLabels();
      labelsBtn.classList.toggle('active', state);
    });

    linksBtn.addEventListener('click', () => {
      const state = Universe.toggleLinks();
      linksBtn.classList.toggle('active', state);
    });

    document.getElementById('universe-zoom-in').addEventListener('click', () => Universe.zoomBy(-2.2));
    document.getElementById('universe-zoom-out').addEventListener('click', () => Universe.zoomBy(2.2));
    document.getElementById('universe-reset-btn').addEventListener('click', () => {
      Universe.resetCamera();
      showToast('3D camera view reset');
    });

    document.getElementById('u-clear-custom-btn').addEventListener('click', () => {
      const remaining = Universe.clearCustomNodes();
      totalPointsEl.textContent = `${remaining} sentences plotted`;
      showToast('Cleared custom plotted sentences');
    });
  }

  /* --------------------------------------------------------------------------
   * LAB 04: CUSTOM EXPLORER
   * -------------------------------------------------------------------------- */
  function initCustomExplorer() {
    const textarea = document.getElementById('explorer-textarea');
    const counter = document.getElementById('explorer-live-counter');
    const analyzeBtn = document.getElementById('explorer-analyze-btn');
    const send3dBtn = document.getElementById('explorer-send-3d-btn');

    const tokenTotalEl = document.getElementById('explorer-token-total');
    const tokensBox = document.getElementById('explorer-tokens-box');
    const sentenceBars = document.getElementById('explorer-sentence-bars');
    const sentenceVecBox = document.getElementById('explorer-sentence-vector');
    const matrixBody = document.getElementById('explorer-matrix-body');

    function updateCounter() {
      counter.textContent = `${textarea.value.length} chars`;
    }

    function runExplorer() {
      const text = textarea.value.trim();
      updateCounter();

      const tokens = Engine.tokenize(text);
      tokenTotalEl.textContent = `${tokens.length} token${tokens.length === 1 ? '' : 's'}`;

      // Also sync the interactive pipeline sample if text is concise
      if (text.length > 0) {
        pipelineSampleText = text.length > 52 ? text.slice(0, 50) + '…' : text;
        renderPipelineStage(currentPipelineStage);
      }

      tokensBox.innerHTML = '';
      matrixBody.innerHTML = '';

      if (tokens.length === 0) {
        tokensBox.innerHTML = '<span class="panel-hint">Enter text above and click Analyze &amp; Encode.</span>';
        sentenceBars.innerHTML = '';
        sentenceVecBox.textContent = '[]';
        return;
      }

      // Render token chips & per-token matrix rows
      tokens.forEach((tok, idx) => {
        const cleanWord = tok.text.replace(/^##/, '');
        const tokEmbed = Engine.embedText(cleanWord, 8);

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `token-chip tok-c${tok.colorIndex}`;
        chip.innerHTML = `<span>${escapeHtml(tok.text)}</span><span class="token-id-tag">#${tok.id}</span>`;

        const tr = document.createElement('tr');
        const vecHtml = tokEmbed.vector
          .slice(0, 6)
          .map((v) => `<span class="${v >= 0 ? 'vec-num-pos' : 'vec-num-neg'}">${v >= 0 ? '+' : ''}${v.toFixed(2)}</span>`)
          .join(', ');

        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><strong>${escapeHtml(tok.text)}</strong></td>
          <td class="text-cyan">${tok.id}</td>
          <td>[${vecHtml}]</td>
        `;

        // Clicking a token chip highlights its corresponding matrix row
        chip.addEventListener('click', () => {
          matrixBody.querySelectorAll('tr').forEach((r) => r.classList.remove('row-highlight'));
          tr.classList.add('row-highlight');
          tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        tokensBox.appendChild(chip);
        matrixBody.appendChild(tr);
      });

      // Pooled sentence embedding (12D simulated demo)
      const sentEmbed = Engine.embedText(text, 12);
      renderVectorBars(sentenceBars, sentEmbed.vector);
      sentenceVecBox.textContent = '[' + sentEmbed.vector.map((v) => (v >= 0 ? ' ' : '') + v.toFixed(4)).join(', ') + ']';
    }

    textarea.addEventListener('input', updateCounter);
    analyzeBtn.addEventListener('click', () => {
      runExplorer();
      showToast('Encoded text into tokens, IDs, and simulated vectors');
    });

    document.querySelectorAll('[data-explorer-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        textarea.value = btn.getAttribute('data-explorer-preset');
        runExplorer();
      });
    });

    send3dBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) {
        showToast('Enter some text first!');
        return;
      }
      Universe.addSentence(text, true, true);
      document.getElementById('visualizer').scrollIntoView({ behavior: 'smooth' });
      showToast('Sent your text to the 3D Semantic Universe!');
    });

    runExplorer();
  }

  /* --------------------------------------------------------------------------
   * LAB 05: INTERACTIVE ANIMATED 7-STAGE LLM PIPELINE
   * -------------------------------------------------------------------------- */
  function renderPipelineStage(stageIdx) {
    currentPipelineStage = stageIdx;
    const stage = Engine.PIPELINE_STAGES[stageIdx];
    if (!stage) return;

    // Highlight active & completed nodes
    document.querySelectorAll('.pipe-node').forEach((node, idx) => {
      const isActive = idx === stageIdx;
      node.classList.toggle('active', isActive);
      node.classList.toggle('completed', idx < stageIdx);
      node.setAttribute('aria-selected', String(isActive));
    });

    // Update text explanation
    document.getElementById('pipeline-active-sample').textContent = `"${pipelineSampleText}"`;
    document.getElementById('pipe-detail-step').textContent = stage.stepLabel;
    document.getElementById('pipe-detail-tag').textContent = stage.tag;
    document.getElementById('pipe-detail-title').textContent = stage.title;
    document.getElementById('pipe-detail-summary').textContent = stage.summary;
    document.getElementById('pipe-detail-why').textContent = stage.why;
    document.getElementById('pipe-detail-real').textContent = stage.real;
    document.getElementById('pipe-preview-heading').textContent = `${stage.title} — Live Demo View`;

    const previewBody = document.getElementById('pipe-preview-body');
    const tokens = Engine.tokenize(pipelineSampleText).slice(0, 7);

    // Render tailored stage-specific educational visualization
    if (stageIdx === 0) {
      previewBody.innerHTML = `
        <div class="preview-quote-box">"${escapeHtml(pipelineSampleText)}"</div>
        <div class="code-box mono-code compact-code">
          raw_string_length = ${pipelineSampleText.length} characters · encoding = UTF-8
        </div>
      `;
    } else if (stageIdx === 1) {
      const chipsHtml = tokens
        .map((t) => `<span class="token-chip tok-c${t.colorIndex}">${escapeHtml(t.text)}</span>`)
        .join('');
      previewBody.innerHTML = `
        <div class="token-chips-container compact">${chipsHtml}</div>
        <div class="code-box mono-code compact-code">Split into ${tokens.length} visual token chunks ready for dictionary lookup.</div>
      `;
    } else if (stageIdx === 2) {
      const mapHtml = tokens
        .map((t) => `<span class="token-chip tok-c${t.colorIndex}">${escapeHtml(t.text)} <span class="token-id-tag">→ ${t.id}</span></span>`)
        .join('');
      previewBody.innerHTML = `
        <div class="token-chips-container compact">${mapHtml}</div>
        <div class="code-box mono-code compact-code">input_ids = [${tokens.map((t) => t.id).join(', ')}]</div>
      `;
    } else if (stageIdx === 3) {
      const rows = tokens
        .slice(0, 4)
        .map((t) => {
          const emb = Engine.embedText(t.text.replace(/^##/, ''), 6).vector;
          return `<div class="pos-token-line">
            <strong class="text-lavender">${escapeHtml(t.text)} (#${t.id})</strong>
            <span class="text-cyan">[${emb.map((v) => v.toFixed(2)).join(', ')}]</span>
          </div>`;
        })
        .join('');
      previewBody.innerHTML = `<div class="pos-wave-row">${rows}</div>
        <p class="panel-hint">Simulated 6D demo embeddings shown for clarity.</p>`;
    } else if (stageIdx === 4) {
      const rows = tokens
        .slice(0, 4)
        .map((t, pos) => {
          const pe = Engine.positionalEncoding(pos, 4);
          return `<div class="pos-token-line">
            <span><strong>pos=${pos}</strong> · ${escapeHtml(t.text)}</span>
            <span class="text-pink">+ PE [${pe.map((v) => v.toFixed(2)).join(', ')}]</span>
          </div>`;
        })
        .join('');
      previewBody.innerHTML = `<div class="pos-wave-row">${rows}</div>
        <p class="panel-hint">Sinusoidal position waves added to each token vector preserve word order.</p>`;
    } else if (stageIdx === 5) {
      // Illustrative self-attention focus weights for the final token attending to earlier tokens
      const focusTok = tokens[tokens.length - 1] || { text: 'language' };
      const weights = tokens.map((t, idx) => {
        const rawW = idx === tokens.length - 1 ? 0.34 : 0.12 + ((t.id % 19) / 45);
        return { tok: t.text, rawW };
      });
      const sumW = weights.reduce((acc, w) => acc + w.rawW, 0) || 1;
      const rowsHtml = weights
        .slice(0, 5)
        .map((w) => {
          const pct = Math.round((w.rawW / sumW) * 100);
          return `
            <div class="attn-row">
              <span>${escapeHtml(w.tok)}</span>
              <div class="attn-bar-bg"><div class="attn-bar-val" style="width:${pct}%"></div></div>
              <span class="text-cyan">${pct}%</span>
            </div>
          `;
        })
        .join('');
      previewBody.innerHTML = `
        <p class="panel-hint">Illustrative attention weights from token <strong>"${escapeHtml(focusTok.text)}"</strong> to context:</p>
        <div class="preview-attention-grid">${rowsHtml}</div>
      `;
    } else if (stageIdx === 6) {
      // Illustrative next-token probability distribution (clearly labeled educational demo)
      const candidates = [
        { word: 'intelligence', prob: 46 },
        { word: 'patterns', prob: 27 },
        { word: 'meaning', prob: 16 },
        { word: 'frontiers', prob: 11 }
      ];
      const rowsHtml = candidates
        .map(
          (c) => `
          <div class="attn-row">
            <strong>${c.word}</strong>
            <div class="attn-bar-bg"><div class="attn-bar-val" style="width:${c.prob}%"></div></div>
            <span class="text-pink">${c.prob}%</span>
          </div>`
        )
        .join('');
      previewBody.innerHTML = `
        <p class="panel-hint">Illustrative next-token probabilities (educational demo, not live model inference):</p>
        <div class="preview-attention-grid">${rowsHtml}</div>
        <div class="code-box mono-code compact-code">Sampled next token → "<strong>${candidates[0].word}</strong>" → appended to output stream!</div>
      `;
    }
  }

  function initPipeline() {
    const nodes = document.querySelectorAll('.pipe-node');
    const prevBtn = document.getElementById('pipeline-prev-btn');
    const nextBtn = document.getElementById('pipeline-next-btn');
    const autoBtn = document.getElementById('pipeline-autoplay-btn');

    function stopAutoPlay() {
      if (pipelineAutoTimer) {
        clearInterval(pipelineAutoTimer);
        pipelineAutoTimer = null;
        autoBtn.textContent = '▶ Auto-Play';
        autoBtn.classList.remove('active');
      }
    }

    nodes.forEach((node) => {
      node.addEventListener('click', () => {
        stopAutoPlay();
        const stage = parseInt(node.getAttribute('data-stage'), 10);
        renderPipelineStage(stage);
      });
    });

    prevBtn.addEventListener('click', () => {
      stopAutoPlay();
      const nextIdx = (currentPipelineStage - 1 + Engine.PIPELINE_STAGES.length) % Engine.PIPELINE_STAGES.length;
      renderPipelineStage(nextIdx);
    });

    nextBtn.addEventListener('click', () => {
      stopAutoPlay();
      const nextIdx = (currentPipelineStage + 1) % Engine.PIPELINE_STAGES.length;
      renderPipelineStage(nextIdx);
    });

    autoBtn.addEventListener('click', () => {
      if (pipelineAutoTimer) {
        stopAutoPlay();
      } else {
        autoBtn.textContent = '❚❚ Pause';
        autoBtn.classList.add('active');
        pipelineAutoTimer = setInterval(() => {
          const nextIdx = (currentPipelineStage + 1) % Engine.PIPELINE_STAGES.length;
          renderPipelineStage(nextIdx);
        }, 3200);
      }
    });

    renderPipelineStage(0);
  }

  /* --------------------------------------------------------------------------
   * BOOTSTRAP ALL LABORATORIES
   * -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTokenizerLab();
    initEmbeddingsLab();
    initUniverseControls();
    initCustomExplorer();
    initPipeline();
  });
})();
