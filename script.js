document.addEventListener('DOMContentLoaded', function() {
  const inputArea = document.getElementById('input');
  const outputArea = document.getElementById('output');
  const errorMessageElement = document.getElementById('error-message');
  const copyButton = document.getElementById('copy-button');
  const historyList = document.getElementById('history-list');
  const clearHistoryButton = document.getElementById('clear-history');
  const charCount = document.getElementById('char-count');

  const MAX_CHARS = 10000; // 将 5000 改为 10000

  let timer;
  const delay = 500; // 500ms delay for lazy mode

  let inputText = ''; // 确保在顶部定义并初始化

  // 加载保存的历史记录
  loadHistory();

  function updateInputArea() {
    inputArea.value = inputText.slice(0, MAX_CHARS);
    inputText = inputArea.value; // 确保 inputText 与实际显示的内容一致
    updateCharCount();
  }

  function updateCharCount() {
    const count = inputText.length;
    charCount.textContent = `${count}/${MAX_CHARS}`;
    charCount.style.color = count > MAX_CHARS ? 'red' : '#666';
  }

  function limitInput(text) {
    if (text.length > MAX_CHARS) {
      return text.slice(0, MAX_CHARS);
    }
    return text;
  }

  function isValidJSON(str) {
    try {
      JSON.parse(str);
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  function formatJSON(json) {
    return JSON.stringify(JSON.parse(json), null, 2);
  }

  function compressJSON(json) {
    return JSON.stringify(JSON.parse(json));
  }

  function truncateString(str, num) {
    if (str.length <= num) {
      return str;
    }
    return str.slice(0, num) + '...';
  }

  function processInput() {
    const input = inputText.trim();
    
    if (input === '') {
      outputArea.value = '';
      errorMessageElement.textContent = '';
      setCopyButtonState(false);
      return;
    }
    
    const truncatedInput = input.slice(0, MAX_CHARS);
    
    // JSON验证
    try {
      const parsedJSON = JSON.parse(truncatedInput);
      const formattedJSON = JSON.stringify(parsedJSON, null, 2);
      outputArea.value = formattedJSON;
      errorMessageElement.textContent = '';
      setCopyButtonState(true);
    } catch (e) {
      outputArea.value = 'Invalid JSON';
      errorMessageElement.textContent = `Error: ${e.message}`;
      setCopyButtonState(false);
    }
  }

  function setCopyButtonState(enabled) {
    copyButton.disabled = !enabled;
    copyButton.style.opacity = enabled ? '1' : '0.5';
    copyButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  function addToHistory(json) {
    const compressedJson = compressJSON(json);
    const truncatedJson = truncateString(compressedJson, 100);
    const currentTime = new Date().toLocaleString();

    const historyItem = {
      content: truncatedJson,
      time: currentTime,
      fullJson: compressedJson
    };

    chrome.storage.local.get({history: []}, function(result) {
      let history = result.history;
      history.unshift(historyItem);
      
      // 确保历史记录最多只有5条
      history = history.slice(0, 5);
      
      chrome.storage.local.set({history: history}, function() {
        updateHistoryDisplay(history);
      });
    });
  }

  function updateHistoryDisplay(history) {
    // 清空历史记录列表
    historyList.innerHTML = '';

    // 只处理最新的5条记录
    history.slice(0, 5).forEach((item, index) => {
      const historyItem = createHistoryItem(item);
      historyList.appendChild(historyItem);
      
      // 为所有项目添加动画类
      requestAnimationFrame(() => {
        historyItem.classList.add(index === 0 ? 'new-item' : 'slide-down');
      });
    });
  }

  function createHistoryItem(item) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
      <span class="history-content" title="${item.content}">${truncateString(item.content, 100)}</span>
      <span class="history-time">${item.time}</span>
      <button class="input-button">Input</button>
    `;

    historyItem.querySelector('.input-button').addEventListener('click', function() {
      inputText = item.fullJson;
      inputArea.value = inputText;
      updateCharCount();
      processInput();
    });

    return historyItem;
  }

  function loadHistory() {
    chrome.storage.local.get({history: []}, function(result) {
      let history = result.history.slice(0, 5);
      
      // 如果加载的历史记录超过 5 条，更新存储
      if (result.history.length > 5) {
        chrome.storage.local.set({history: history});
      }
      
      updateHistoryDisplay(history);
    });
  }

  function clearHistory() {
    chrome.storage.local.set({history: []}, function() {
      historyList.innerHTML = '';
    });
  }

  inputArea.addEventListener('input', function(e) {
    clearTimeout(timer);
    inputText = inputArea.value; // 立即更新 inputText
    updateCharCount(); // 立即更新字符计数
    timer = setTimeout(() => {
      processInput();
    }, delay);
  });

  inputArea.addEventListener('paste', function(e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    inputText = pastedText.slice(0, MAX_CHARS);
    inputArea.value = inputText;
    updateCharCount();
    processInput();
    
    if (pastedText.length > MAX_CHARS) {
      errorMessageElement.textContent = `Warning: Pasted content was truncated to ${MAX_CHARS} characters`;
    }
  });

  copyButton.addEventListener('click', function() {
    if (!copyButton.disabled) {
      outputArea.select();
      document.execCommand('copy');
      copyButton.textContent = 'Copied';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);

      addToHistory(outputArea.value);
    }
  });

  clearHistoryButton.addEventListener('click', clearHistory);

  // 初始化复制按钮状态
  setCopyButtonState(false);
  
  // 初始化字符计数
  updateCharCount();
});