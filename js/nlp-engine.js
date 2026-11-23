/**
 * ============================================================================
 * LLMVerse — Educational NLP & Simulated Embedding Engine (js/nlp-engine.js)
 * ============================================================================
 * Beginner-friendly, deterministic educational engine that powers:
 *   1. Subword-style Tokenizer with consistent Token IDs
 *   2. Simulated Semantic Embeddings (explicitly for educational demonstration)
 *   3. Cosine Similarity & Sinusoidal Positional Encoding math
 *   4. 3D Semantic Projection for the Interactive 3D Universe
 *   5. 7-Stage LLM Pipeline Educational Walkthrough Data
 *
 * NOTE: This module produces deterministic educational simulations so learners
 * can explore how LLMs process language right in the browser. It is NOT live
 * neural network inference.
 */

window.LLMVerseEngine = (function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. DETERMINISTIC HASH & SEEDED PRNG HELPERS
   * -------------------------------------------------------------------------- */

  /**
   * FNV-1a 32-bit hash: turns any string into a consistent unsigned integer.
   * Same input text ALWAYS produces the exact same hash number.
   */
  function fnv1aHash(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /**
   * Mulberry32 seeded pseudo-random generator.
   * Gives reproducible floating-point values in [0, 1) for a given integer seed.
   */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --------------------------------------------------------------------------
   * 2. EDUCATIONAL BPE-STYLE TOKENIZER
   * -------------------------------------------------------------------------- */

  // Fixed starter vocabulary so common AI & English words have tidy, memorable IDs
  const BASE_VOCAB = {
    'the': 101, 'a': 102, 'an': 103, 'to': 104, 'of': 105, 'in': 106, 'into': 107,
    'and': 108, 'is': 109, 'are': 110, 'for': 111, 'with': 112, 'from': 113,
    'where': 120, 'language': 201, 'meets': 202, 'mind': 203, 'ai': 204,
    'large': 210, 'model': 211, 'models': 212, 'llm': 213, 'llmverse': 214,
    'token': 220, 'tokens': 221, 'decode': 222, 'encode': 223, 'human': 224,
    'meaning': 225, 'cosmic': 226, 'vector': 227, 'vectors': 228, 'neural': 229,
    'network': 230, 'networks': 231, 'transformer': 232, 'transformers': 233,
    'attention': 234, 'self': 235, 'galaxy': 240, 'universe': 241, 'space': 242,
    'hello': 250, 'world': 251, 'words': 252, 'text': 253, 'predict': 254,
    'intelligence': 255, 'embedding': 256, 'embeddings': 257, 'future': 258,
    '.': 11, ',': 12, '!': 13, '?': 14, ':': 15, ';': 16, '-': 17, '"': 18, "'": 19
  };

  // Common educational prefixes & suffixes to demonstrate subword splitting
  const PREFIXES = ['un', 're', 'pre', 'dis', 'non', 'inter', 'trans', 'neuro', 'super', 'multi', 'micro', 'hyper'];
  const SUFFIXES = ['ization', 'ational', 'ability', 'ilities', 'fulness', 'ment', 'tion', 'sion', 'able', 'ible', 'ness', 'less', 'ings', 'ing', 'ers', 'ful', 'ive', 'ous', 'ity', 'ed', 'ly', 'es', 's'];

  /**
   * Splits a single alphabetic word into educational subword pieces when long.
   */
  function splitIntoSubwords(word) {
    const lower = word.toLowerCase();

    // Keep short words or known base-vocab words intact
    if (word.length <= 6 || BASE_VOCAB[lower]) {
      return [{ text: word, kind: 'word' }];
    }

    const pieces = [];
    let remaining = word;

    // Check educational prefix
    for (const pre of PREFIXES) {
      if (remaining.toLowerCase().startsWith(pre) && remaining.length - pre.length >= 4) {
        pieces.push({ text: remaining.slice(0, pre.length), kind: 'prefix' });
        remaining = remaining.slice(pre.length);
        break;
      }
    }

    // Check educational suffix
    let matchedSuffix = null;
    for (const suf of SUFFIXES) {
      if (remaining.toLowerCase().endsWith(suf) && remaining.length - suf.length >= 3) {
        matchedSuffix = remaining.slice(remaining.length - suf.length);
        remaining = remaining.slice(0, remaining.length - suf.length);
        break;
      }
    }

    // Push stem (marked with ## if preceded by a prefix)
    if (remaining.length > 0) {
      pieces.push({
        text: pieces.length > 0 ? '##' + remaining : remaining,
        kind: pieces.length > 0 ? 'subword' : 'word'
      });
    }

    // Push suffix marked with ## (WordPiece/BPE educational convention)
    if (matchedSuffix) {
      pieces.push({ text: '##' + matchedSuffix, kind: 'suffix' });
    }

    return pieces;
  }

  /**
   * Returns a consistent integer Token ID for any token string.
   */
  function getTokenId(tokenText) {
    const normalized = tokenText.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(BASE_VOCAB, normalized)) {
      return BASE_VOCAB[normalized];
    }
    // Deterministic ID in [1000, 49999]
    return 1000 + (fnv1aHash('llmverse_tok_' + normalized) % 49000);
  }

  /**
   * Tokenizes any sentence into an array of rich token objects:
   *   { text, id, kind, index, colorIndex, charLength }
   */
  function tokenize(text) {
    if (!text || !text.trim()) return [];

    // Match words, numbers, or individual punctuation/symbols
    const rawMatches = text.match(/[A-Za-z]+|\d+|[^\sA-Za-z0-9]/g) || [];
    const tokens = [];

    rawMatches.forEach((raw) => {
      if (/^[A-Za-z]+$/.test(raw)) {
        const subwords = splitIntoSubwords(raw);
        subwords.forEach((sw) => {
          tokens.push({
            text: sw.text,
            id: getTokenId(sw.text),
            kind: sw.kind,
            index: tokens.length,
            colorIndex: tokens.length % 5,
            charLength: sw.text.replace(/^##/, '').length
          });
        });
      } else if (/^\d+$/.test(raw)) {
        // Split very long numbers into 2-4 digit chunks like modern tokenizers
        const chunks = raw.length > 4 ? raw.match(/.{1,3}/g) : [raw];
        chunks.forEach((chunk, idx) => {
          const piece = idx === 0 ? chunk : '##' + chunk;
          tokens.push({
            text: piece,
            id: getTokenId(piece),
            kind: 'number',
            index: tokens.length,
            colorIndex: tokens.length % 5,
            charLength: chunk.length
          });
        });
      } else {
        tokens.push({
          text: raw,
          id: getTokenId(raw),
          kind: 'punctuation',
          index: tokens.length,
          colorIndex: tokens.length % 5,
          charLength: raw.length
        });
      }
    });

    return tokens;
  }

  /* --------------------------------------------------------------------------
   * 3. SIMULATED SEMANTIC EMBEDDINGS (EDUCATIONAL DEMONSTRATION)
   * -------------------------------------------------------------------------- */

  // Human-readable educational feature labels for dimensions 0..23
  const DIMENSION_LABELS = [
    'AI & Computation', 'Space & Cosmos', 'Language & Meaning', 'Nature & Life',
    'Logic & Math', 'Creativity & Art', 'Scale & Grandeur', 'Human & Royalty',
    'Energy & Light', 'Structure & Systems', 'Motion & Time', 'Emotion & Empathy',
    'Discovery & Science', 'Harmony & Pattern', 'Memory & Context', 'Abstraction Level',
    'Signal Strength', 'Connectivity', 'Curiosity Factor', 'Order & Syntax',
    'Spatial Depth', 'Acoustic Rhythm', 'Organic Texture', 'Quantum Horizon'
  ];

  // Semantic concept anchors so related terms cluster meaningfully in demos
  const SEMANTIC_CLUSTERS = {
    ai: {
      name: 'AI & Computing',
      colorHex: '#38bdf8',
      center3D: [4.2, 1.8, 2.6],
      keywords: [
        'ai', 'llm', 'llmverse', 'neural', 'network', 'networks', 'model', 'models',
        'transformer', 'transformers', 'token', 'tokens', 'embedding', 'embeddings',
        'vector', 'vectors', 'algorithm', 'compute', 'computer', 'machine', 'learning',
        'deep', 'attention', 'weights', 'matrix', 'code', 'data', 'silicon', 'prompt',
        'inference', 'gradient', 'predict', 'probabilities', 'intelligence', 'mind', 'brain', 'robot'
      ],
      signature: [0.95, 0.15, 0.45, -0.35, 0.85, 0.05, 0.25, -0.2, 0.55, 0.88, 0.2, -0.25, 0.72, 0.48, 0.78, 0.82]
    },
    cosmos: {
      name: 'Space & Cosmos',
      colorHex: '#c084fc',
      center3D: [-4.4, 2.4, -1.8],
      keywords: [
        'galaxy', 'galaxies', 'cosmos', 'cosmic', 'nebula', 'star', 'stars', 'starlight',
        'planet', 'planets', 'universe', 'space', 'orbit', 'gravity', 'quantum', 'black',
        'hole', 'quasar', 'telescope', 'astronomy', 'celestial', 'constellation', 'constellations',
        'solar', 'moon', 'comet', 'supernova', 'lightyear', 'void', 'interstellar', 'horizon', 'mars'
      ],
      signature: [0.18, 0.96, 0.08, -0.15, 0.42, 0.3, 0.94, -0.3, 0.88, 0.35, 0.75, 0.1, 0.85, 0.45, 0.15, 0.65]
    },
    language: {
      name: 'Language & Creativity',
      colorHex: '#f472b6',
      center3D: [1.5, -3.5, -3.6],
      keywords: [
        'language', 'word', 'words', 'sentence', 'sentences', 'poetry', 'poem', 'story',
        'stories', 'book', 'write', 'writing', 'creative', 'creativity', 'music', 'art',
        'human', 'humans', 'emotion', 'emotions', 'dream', 'dreams', 'king', 'queen',
        'prince', 'princess', 'voice', 'speak', 'meaning', 'metaphor', 'novel', 'hello',
        'culture', 'philosophy', 'song', 'melody', 'imagination', 'idea', 'ideas'
      ],
      signature: [0.22, 0.12, 0.95, 0.05, -0.1, 0.92, 0.15, 0.85, 0.28, 0.18, 0.12, 0.9, 0.08, 0.72, 0.62, 0.52]
    },
    nature: {
      name: 'Nature & Science',
      colorHex: '#22d3ee',
      center3D: [-2.8, -2.6, 3.8],
      keywords: [
        'forest', 'ocean', 'sea', 'river', 'mountain', 'earth', 'nature', 'tree', 'trees',
        'leaf', 'biology', 'dna', 'cell', 'life', 'animal', 'cat', 'dog', 'bird', 'whale',
        'rain', 'storm', 'sunlight', 'water', 'coral', 'ecosystem', 'flower', 'garden',
        'wind', 'climate', 'evolution', 'species', 'oxygen', 'green', 'wild', 'aurora'
      ],
      signature: [-0.35, 0.22, -0.05, 0.96, -0.18, 0.35, 0.55, 0.12, 0.45, 0.28, 0.42, 0.48, 0.62, 0.68, 0.1, -0.25]
    }
  };

  /**
   * Computes L2 norm (Euclidean length) of a vector.
   */
  function vectorNorm(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
    return Math.sqrt(sumSq) || 1;
  }

  /**
   * Normalizes a vector so its Euclidean length equals 1.000.
   */
  function normalizeVector(vec) {
    const norm = vectorNorm(vec);
    return vec.map((v) => Number((v / norm).toFixed(4)));
  }

  /**
   * Generates a deterministic, simulated semantic embedding for a word or sentence.
   * Returns { vector, dimensions, norm, clusterKey, clusterName, colorHex, isSimulated: true }.
   */
  function embedText(text, dimensions = 16) {
    const clean = (text || 'llmverse').trim().toLowerCase();
    const words = clean.match(/[a-z0-9]+/g) || ['llmverse'];

    // Measure overlap with each educational semantic cluster
    const clusterScores = { ai: 0, cosmos: 0, language: 0, nature: 0 };
    words.forEach((w) => {
      Object.keys(SEMANTIC_CLUSTERS).forEach((key) => {
        const kwList = SEMANTIC_CLUSTERS[key].keywords;
        if (kwList.includes(w)) {
          clusterScores[key] += 1.5;
        } else if (w.length >= 4 && kwList.some((k) => k.startsWith(w) || w.startsWith(k))) {
          clusterScores[key] += 0.75;
        }
      });
    });

    // Identify dominant semantic cluster
    let bestClusterKey = 'ai';
    let bestScore = 0;
    Object.keys(clusterScores).forEach((key) => {
      if (clusterScores[key] > bestScore) {
        bestScore = clusterScores[key];
        bestClusterKey = key;
      }
    });

    // If no anchor keyword matched, pick a deterministic cluster based on text hash
    if (bestScore === 0) {
      const keys = Object.keys(SEMANTIC_CLUSTERS);
      bestClusterKey = keys[fnv1aHash(clean) % keys.length];
    }

    // Build raw vector by blending matched concept signatures + deterministic word hash noise
    const raw = new Array(dimensions).fill(0);
    const totalMatch = Object.values(clusterScores).reduce((a, b) => a + b, 0);

    for (let d = 0; d < dimensions; d++) {
      let val = 0;
      if (totalMatch > 0) {
        Object.keys(SEMANTIC_CLUSTERS).forEach((key) => {
          if (clusterScores[key] > 0) {
            const sig = SEMANTIC_CLUSTERS[key].signature;
            const sigVal = sig[d % sig.length];
            val += (clusterScores[key] / totalMatch) * sigVal * 0.85;
          }
        });
      } else {
        // Gentle blend toward hashed cluster so even arbitrary words sit cleanly in space
        const sig = SEMANTIC_CLUSTERS[bestClusterKey].signature;
        val += sig[d % sig.length] * 0.35;
      }

      // Add deterministic lexical fingerprint per word so every unique phrase has its own vector
      let lexicalSum = 0;
      words.forEach((w) => {
        const rng = mulberry32(fnv1aHash(w + '_dim_' + d));
        lexicalSum += (rng() * 2 - 1);
      });
      val += (lexicalSum / words.length) * (totalMatch > 0 ? 0.34 : 0.72);
      raw[d] = val;
    }

    const vector = normalizeVector(raw);
    const clusterObj = SEMANTIC_CLUSTERS[bestClusterKey];

    return {
      text: text.trim(),
      vector,
      dimensions,
      norm: Number(vectorNorm(vector).toFixed(3)),
      clusterKey: bestClusterKey,
      clusterName: clusterObj.name,
      colorHex: clusterObj.colorHex,
      isSimulated: true
    };
  }

  /**
   * Computes exact mathematical Cosine Similarity in [-1, 1] between two vectors.
   */
  function cosineSimilarity(vecA, vecB) {
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Projects a simulated embedding into 3D coordinates (x, y, z) for the 3D Universe.
   * Uses the semantic cluster anchor + vector-driven offsets so similar sentences
   * visually group into glowing cosmic neighborhoods.
   */
  function projectTo3D(embedResult) {
    const center = SEMANTIC_CLUSTERS[embedResult.clusterKey].center3D;
    const v = embedResult.vector;
    const rng = mulberry32(fnv1aHash(embedResult.text.toLowerCase()));

    const x = center[0] + (v[0] - v[4]) * 2.1 + (rng() - 0.5) * 1.4;
    const y = center[1] + (v[1] - v[5]) * 2.1 + (rng() - 0.5) * 1.4;
    const z = center[2] + (v[2] - v[3]) * 2.1 + (rng() - 0.5) * 1.4;

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(2))
    };
  }

  /**
   * Textbook Transformer Sinusoidal Positional Encoding (Vaswani et al., 2017):
   *   PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
   *   PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))
   */
  function positionalEncoding(pos, dModel = 6) {
    const pe = [];
    for (let i = 0; i < dModel; i++) {
      const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dModel);
      const val = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
      pe.push(Number(val.toFixed(3)));
    }
    return pe;
  }

  /* --------------------------------------------------------------------------
   * 4. CURATED 3D UNIVERSE STARTER SENTENCES
   * -------------------------------------------------------------------------- */
  const STARTER_UNIVERSE_SENTENCES = [
    // AI & Computing
    'Large language models decode patterns across billions of tokens.',
    'Transformer self-attention weighs relationships between every word.',
    'Neural networks map human concepts into geometric vector spaces.',
    'Gradient descent updates model weights during AI training.',
    // Space & Cosmos
    'Distant galaxies shimmer across the expanding cosmic horizon.',
    'Supermassive black holes bend starlight and curve spacetime.',
    'Deep space telescopes capture glowing nebulae born from stardust.',
    'Quantum particles dance through the interstellar vacuum.',
    // Language & Creativity
    'Human poetry weaves emotion and rhythm into unforgettable stories.',
    'Every metaphor bridges two distant ideas through language.',
    'The queen and king debated philosophy in the grand library.',
    'Music and literature illuminate the depths of human imagination.',
    // Nature & Science
    'Ancient emerald forests breathe oxygen into Earths atmosphere.',
    'Bioluminescent creatures illuminate the midnight ocean floor.',
    'Genetic DNA sequences encode the blueprint of living organisms.',
    'Northern aurora lights shimmer above frozen mountain peaks.'
  ];

  /* --------------------------------------------------------------------------
   * 5. 7-STAGE INTERACTIVE LLM PIPELINE DEFINITIONS
   * -------------------------------------------------------------------------- */
  const PIPELINE_STAGES = [
    {
      index: 0,
      stepLabel: 'STAGE 01 / 07',
      tag: 'HUMAN INPUT',
      title: 'Input Text',
      summary: 'Everything begins with your prompt—ordinary human text made of words, punctuation, and ideas. At this stage, it is just a raw string of characters that a neural network cannot directly compute.',
      why: 'Language is rich and ambiguous. Turning raw text into structured mathematics is the bridge between human thought and AI computation.',
      real: 'Modern LLMs accept context windows from 128,000 up to millions of tokens—enough for entire books or codebases.'
    },
    {
      index: 1,
      stepLabel: 'STAGE 02 / 07',
      tag: 'SEGMENTATION',
      title: 'Tokenization',
      summary: 'The tokenizer slices your prompt into small reusable building blocks called tokens. Common words stay whole, while rare or compound words break into subword pieces.',
      why: 'Splitting into subwords keeps vocabulary size manageable while letting the model understand brand-new or misspelled words.',
      real: 'GPT, Claude, and Gemini use Byte-Pair Encoding (BPE) or SentencePiece vocabularies with 50,000 to 256,000 tokens.'
    },
    {
      index: 2,
      stepLabel: 'STAGE 03 / 07',
      tag: 'VOCABULARY LOOKUP',
      title: 'Token IDs',
      summary: 'Each token is looked up in the model’s dictionary and replaced by its unique integer ID. Your sentence is now a sequence of whole numbers.',
      why: 'Neural networks operate on numbers, not letters. Integer IDs act like row numbers in a massive lookup table.',
      real: 'Token IDs carry no inherent meaning on their own—ID 204 is not "twice" ID 102. Meaning arrives in the next stage!'
    },
    {
      index: 3,
      stepLabel: 'STAGE 04 / 07',
      tag: 'SEMANTIC VECTORS',
      title: 'Embeddings',
      summary: 'Each Token ID fetches a dense vector of floating-point numbers from the embedding matrix. Suddenly, every token becomes a point in high-dimensional semantic space.',
      why: 'Embeddings capture meaning geometrically—similar concepts cluster together so the model can generalize across related ideas.',
      real: 'While our demo uses 8–24 dimensions for readability, frontier LLMs represent each token with 4,096 to 12,288+ dimensions.'
    },
    {
      index: 4,
      stepLabel: 'STAGE 05 / 07',
      tag: 'SEQUENCE ORDER',
      title: 'Positional Encoding',
      summary: 'Because Transformers read all tokens in parallel, they inject a mathematical wave signal (sinusoidal or rotary) into each embedding so the model knows which word came 1st, 2nd, or 10th.',
      why: '"Dog bites man" and "Man bites dog" contain identical tokens—word order completely changes the meaning!',
      real: 'Original Transformers used sine/cosine waves; modern LLMs commonly use Rotary Position Embeddings (RoPE) for long context.'
    },
    {
      index: 5,
      stepLabel: 'STAGE 06 / 07',
      tag: 'MULTI-HEAD SELF-ATTENTION',
      title: 'Transformer',
      summary: 'Inside stacked Transformer blocks, Self-Attention lets every token look at every other token to gather context, while feed-forward neural layers refine deep abstract features.',
      why: 'Attention resolves ambiguity—helping the model know whether "bank" refers to a river or a financial vault based on neighboring words.',
      real: 'Frontier LLMs stack dozens to over a hundred Transformer layers, each with 32–128 parallel attention heads.'
    },
    {
      index: 6,
      stepLabel: 'STAGE 07 / 07',
      tag: 'NEXT-TOKEN PREDICTION',
      title: 'Output Text',
      summary: 'The final layer outputs a probability score for every token in the vocabulary. The model samples the next token, appends it, and repeats—weaving coherent answers one token at a time.',
      why: 'Sampling controls (like temperature and top-p) balance factual precision against creative variety.',
      real: 'Every fluent paragraph you read from an AI is generated sequentially through this exact next-token loop. (Demo probabilities shown on the right are illustrative.)'
    }
  ];

  // Public API
  return {
    tokenize,
    getTokenId,
    embedText,
    cosineSimilarity,
    projectTo3D,
    positionalEncoding,
    DIMENSION_LABELS,
    SEMANTIC_CLUSTERS,
    STARTER_UNIVERSE_SENTENCES,
    PIPELINE_STAGES
  };
})();
