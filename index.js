/**
 * =================================================================
 * 模块导入与常量定义
 * =================================================================
 */
import {
  this_chid,
  characters,
  eventSource,
  event_types,
} from "../../../../script.js";
import { writeExtensionField } from "../../../extensions.js";
import { Popup, POPUP_RESULT, POPUP_TYPE } from "../../../popup.js";
import { translations } from "./i18n.js";

const extensionName = "st-extension-qiros";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

/**
 * =================================================================
 * 全局状态变量
 * =================================================================
 */
let loginView,
  mainView,
  userInfoContainer,
  userAvatar,
  userLogin,
  repoManagementContainer,
  upstreamRepoUrlDisplay,
  forkRepoUrlDisplay,
  repoUrlInput,
  commitMessageInput,
  associateRepoButton,
  createRepoButton,
  forkRepoButton,
  unlinkRepoButton,
  createPrButton,
  checkUpdatesButton,
  pullButton,
  pushButton,
  pushTargetContainer,
  pushTargetSelect,
  branchManagementContainer,
  branchSelect,
  newBranchButton,
  historyButton,
  releaseButton,
  characterVersionDisplay,
  historyDetailsSection,
  historyList,
  revertButton,
  historyDiffContainer,
  historyDiffView,
  selectedCommitSha = null,
  currentUser = null,
  currentLang = "zh",
  langSelect,
  currentQirosData = null;

/**
 * =================================================================
 * CSRF令牌获取 (getCsrfToken)
 * =================================================================
 */
async function getCsrfToken() {
  try {
    const response = await fetch(`/csrf-token?_=${new Date().getTime()}`);
    if (!response.ok) {
      throw new Error(`服务器在获取CSRF令牌时出错: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.token) {
      throw new Error("从 /csrf-token 返回的JSON响应中未找到 `token` 字段。");
    }
    return data.token;
  } catch (error) {
    console.error("获取CSRF令牌失败:", error);
    toastr.error("无法获取安全令牌。请刷新页面并重试。");
    return null;
  }
}

/**
 * =================================================================
 * UI与数据处理辅助函数
 * =================================================================
 */

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[lang] && translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });
}

/**
 * @description 获取本插件在角色卡中存储的数据。
 * @returns {object|undefined} - 返回存储的对象，如果不存在则返回undefined。
 */
function getExtensionData() {
  const character = characters[this_chid];
  return character?.data?.extensions?.[extensionName];
}

/**
 * @description 将数据合并并保存到当前角色的插件数据字段中。
 * @param {object} dataToSave - 要合并保存的JavaScript对象。
 */
async function saveExtensionData(dataToSave) {
  console.log("[Qiros Debug] Preparing to save data:", dataToSave);
  const existingData = getExtensionData() || {};
  const newData = { ...existingData, ...dataToSave };
  console.log("[Qiros Debug] Merged data to be saved:", newData);
  // 使用SillyTavern核心函数来写入数据，确保兼容性
  await writeExtensionField(this_chid, extensionName, newData);
  currentQirosData = newData;
  console.log(
    "[Qiros Debug] Data supposedly saved and local state updated for character:",
    this_chid
  );
}

function updateViewState(user) {
  if (user) {
    currentUser = user;
    loginView.hide();
    mainView.show();
    userInfoContainer.show();
    userAvatar.attr("src", user.avatar_url);
    userLogin.text(user.login);
    refreshCharacterView();
  } else {
    currentUser = null;
    loginView.show();
    mainView.hide();
    userInfoContainer.hide();
    userAvatar.attr("src", "");
    userLogin.text("");
    updateRepoView(null);
  }
}

function updateRepoView(extensionData) {
  console.log(
    "[Qiros Debug] updateRepoView triggered. Received data:",
    JSON.parse(JSON.stringify(extensionData || {}))
  );

  $("#repo-initial-actions").show();
  $(".qiros-repo-info").hide();
  branchManagementContainer.hide();
  createPrButton.hide();
  pushTargetContainer.hide();
  unlinkRepoButton.hide();
  pushButton.show();
  forkRepoButton.prop("disabled", true); // 默认禁用复刻按钮
  createPrButton.hide(); // 默认隐藏PR按钮

  // Disable all action buttons by default
  checkUpdatesButton.prop("disabled", true);
  pullButton.prop("disabled", true);
  pushButton.prop("disabled", true);
  newBranchButton.prop("disabled", true);
  historyButton.prop("disabled", true);
  releaseButton.prop("disabled", true);

  console.log("[Qiros Debug] UI reset to initial state.");

  // 2. Clear any lingering data from all display elements.
  upstreamRepoUrlDisplay
    .text(translations[currentLang]["none"])
    .attr("href", "#");
  forkRepoUrlDisplay.text(translations[currentLang]["none"]).attr("href", "#");
  characterVersionDisplay.text(translations[currentLang]["none"]);
  branchSelect.empty();
  console.log("[Qiros Debug] Display elements cleared.");

  if (!extensionData) {
    console.log(
      "[Qiros Debug] No extension data. View will remain in clean state."
    );
    return;
  }

  const { upstreamUrl, forkUrl, repoUrl, commitSha } = extensionData;
  console.log("[Qiros Debug] Destructured data:", {
    upstreamUrl,
    forkUrl,
    repoUrl,
    commitSha,
  });
  const displayUrl = upstreamUrl || repoUrl;
  const branchUpdateUrl = forkUrl || upstreamUrl || repoUrl;

  characterVersionDisplay.text(
    commitSha ? commitSha.substring(0, 7) : translations[currentLang]["none"]
  );

  if (displayUrl) {
    console.log("[Qiros Debug] A repo is linked. Hiding initial actions.");
    $("#repo-initial-actions").hide();

    // Display the repo URLs.
    $(".qiros-repo-info").show();
    upstreamRepoUrlDisplay.text(displayUrl).attr("href", displayUrl);
    forkRepoUrlDisplay
      .text(forkUrl || translations[currentLang]["none"])
      .attr("href", forkUrl || "#");

    // Show branch management and populate it.
    branchManagementContainer.show();
    updateBranchView(branchUpdateUrl);
    unlinkRepoButton.show();

    // Enable action buttons now that a repo is linked
    checkUpdatesButton.prop("disabled", false);
    pullButton.prop("disabled", false);
    pushButton.prop("disabled", false);
    newBranchButton.prop("disabled", false);
    historyButton.prop("disabled", false);
    releaseButton.prop("disabled", false);

    console.log("[Qiros Debug] Displaying repo info and branches.");

    // 无论是否有上游仓库，只要登录，复刻按钮就可见
    forkRepoButton.prop("disabled", false);

    if (upstreamUrl && !forkUrl) {
      console.log(
        "[Qiros Debug] Scenario: Upstream only. Fork button enabled."
      );
    } else if (upstreamUrl && forkUrl) {
      console.log(
        "[Qiros Debug] Scenario: Upstream and Fork. Showing PR and Push Target selector. Fork button disabled."
      );
      createPrButton.show(); // 显示PR按钮
      pushTargetContainer.show();
      forkRepoButton.prop("disabled", true); // 如果已经复刻，则禁用复刻按钮
    } else {
      console.log(
        "[Qiros Debug] Scenario: No upstream linked. Fork button enabled for manual input."
      );
      // 如果没有上游仓库，复刻按钮也应该可用，以便用户输入上游仓库URL
      forkRepoButton.prop("disabled", false);
      createPrButton.hide(); // 没有上游或复刻时隐藏PR按钮
    }
  } else {
    console.log("[Qiros Debug] No displayUrl. View remains in clean state.");
  }
}

/**
 * @description 核心刷新函数。在用户登录或切换角色时调用，读取角色数据并更新整个UI。
 */
function refreshCharacterView() {
  console.log(
    `[Qiros Debug] refreshCharacterView triggered for character ID: ${this_chid}.`
  );
  if (!currentUser) {
    console.log("[Qiros Debug] Aborting refresh: User not logged in.");
    return;
  }

  if (this_chid === undefined || this_chid === null) {
    console.log("[Qiros Debug] No character selected. Clearing repo view.");
    updateRepoView(null);
    return;
  }

  console.log("[Qiros Debug] Character selected. Getting extension data.");
  currentQirosData = getExtensionData();
  updateRepoView(currentQirosData);
}

async function updateBranchView(repoUrl) {
  try {
    const response = await fetch(
      `/api/plugins/qiros-server/branches?repoUrl=${encodeURIComponent(
        repoUrl
      )}`
    );
    if (!response.ok)
      throw new Error(translations[currentLang]["branch_list_failed"]);
    const { branches } = await response.json();
    if (!Array.isArray(branches))
      throw new Error(translations[currentLang]["branch_data_not_array"]);
    branchSelect.empty();
    branches.forEach((branch) => {
      const option = $(`<option></option>`).val(branch.name).text(branch.name);
      branchSelect.append(option);
    });
  } catch (error) {
    console.error("更新分支视图时出错:", error);
    toastr.error(error.message);
    branchManagementContainer.hide();
  }
}

/**
 * =================================================================
 * 用户认证与仓库管理 (事件处理函数)
 * =================================================================
 */

function onLoginClick() {
  window.location.href = "/api/plugins/qiros-server/github_login";
}

async function onLogoutClick() {
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const response = await fetch("/api/plugins/qiros-server/logout", {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      updateViewState(null);
      toastr.success(translations[currentLang]["logout_successful"]);
    } else {
      toastr.error(
        `${translations[currentLang]["logout_failed"]}: ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("登出过程中出错:", error);
    toastr.error(translations[currentLang]["logout_error"]);
  }
}

async function onAssociateRepoClick() {
  const repoUrl = repoUrlInput.val().trim();
  if (
    !repoUrl.match(
      /^https:\/\/github\.com\/[a-zA-Z0-9-_\.]+\/[a-zA-Z0-9-_\.]+(\.git)?$/i
    )
  ) {
    toastr.warning(translations[currentLang]["invalid_repo_url"]);
    return;
  }

  try {
    const dataToSave = {
      upstreamUrl: repoUrl,
      forkUrl: null,
      repoUrl: null,
      commitSha: null,
    };
    console.log("[Qiros Debug] Associating repo. Data to save:", dataToSave);
    await saveExtensionData(dataToSave);
    updateRepoView(currentQirosData); // Use the updated state
    toastr.success("上游仓库链接成功！");
  } catch (error) {
    console.error("链接上游仓库时出错:", error);
    toastr.error(`链接失败: ${error.message}`);
  }
}

async function onUnlinkRepoClick() {
  try {
    const dataToSave = {
      repoUrl: null,
      upstreamUrl: null,
      forkUrl: null,
      commitSha: null,
      branch: null,
    };
    await saveExtensionData(dataToSave);
    updateRepoView(currentQirosData); // Use the updated state
    toastr.success(translations[currentLang]["unlink_successful"]);
  } catch (error) {
    console.error("Error unlinking repository:", error);
    toastr.error(
      `${translations[currentLang]["unlink_failed"]}: ${error.message}`
    );
  }
}

async function onCreateRepoClick() {
  const character = characters[this_chid];
  if (!character || !character.avatar) {
    toastr.warning(translations[currentLang]["load_character_first"]);
    return;
  }
  let defaultRepoName = character.data.name
    .replace(/[^a-zA-Z0-9-_\.]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!defaultRepoName) {
    defaultRepoName = "new-character-repo";
  }

  const repoName = await Popup.show.input(
    translations[currentLang]["create_new_repo"],
    translations[currentLang]["enter_repo_name"],
    defaultRepoName
  );
  if (repoName === null) return; // User cancelled

  toastr.info(`${translations[currentLang]["creating_repo"]} "${repoName}"...`);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;

    const createResponse = await fetch(
      `/api/plugins/qiros-server/create_repo`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ repoName, characterId: this_chid }),
      }
    );

    const result = await createResponse.json();
    if (!createResponse.ok) {
      throw new Error(
        result.message || translations[currentLang]["creation_failed"]
      );
    }

    const newRepoUrl = result.repoUrl;
    const dataToSave = {
      repoUrl: newRepoUrl,
      upstreamUrl: null,
      forkUrl: null,
      commitSha: null,
    };
    await saveExtensionData(dataToSave);

    updateRepoView(currentQirosData);
    toastr.success(
      `${translations[currentLang]["repo"]} "${repoName}" ${translations[currentLang]["created_and_linked"]}`
    );
  } catch (error) {
    console.error("创建仓库时出错:", error);
    toastr.error(
      `${translations[currentLang]["creation_failed"]}: ${error.message}`
    );
  }
}

/**
 * =================================================================
 * 核心Git操作 (事件处理函数)
 * =================================================================
 */

async function onPushClick() {
  const character = characters[this_chid];
  if (!character) {
    toastr.warning(translations[currentLang]["load_character_first"]);
    return;
  }
  const extensionData = currentQirosData;
  let repoUrl;

  if (pushTargetContainer.is(":visible")) {
    const target = pushTargetSelect.val();
    repoUrl =
      target === "fork" ? extensionData.forkUrl : extensionData.upstreamUrl;
  } else {
    repoUrl =
      extensionData?.forkUrl ||
      extensionData?.upstreamUrl ||
      extensionData?.repoUrl;
  }

  if (!repoUrl) {
    toastr.warning(translations[currentLang]["no_repo_linked"]);
    return;
  }
  const branch = branchSelect.val();
  if (!branch) {
    toastr.warning(translations[currentLang]["select_branch"]);
    return;
  }
  const commitMessage = commitMessageInput.val().trim();
  if (!commitMessage) {
    toastr.warning(translations[currentLang]["enter_commit_message"]);
    return;
  }
  toastr.info(translations[currentLang]["pushing_to_github"]);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const response = await fetch("/api/plugins/qiros-server/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        repoUrl,
        branch,
        characterData: filterCharacterData(characters[this_chid]), // 过滤不必要的字段
        commitMessage,
        csrfToken,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.details || translations[currentLang]["push_failed"]
      );

    if (result.commitSha) {
      const newSha = result.commitSha;
      await saveExtensionData({ commitSha: newSha });
      characterVersionDisplay.text(newSha.substring(0, 7));
    }
    toastr.success(translations[currentLang]["push_successful"]);
    commitMessageInput.val("");

    // 如果历史记录视图是打开的，则刷新它
    if (historyDetailsSection.is(":visible")) {
      loadHistory();
    }
  } catch (error) {
    console.error("推送角色时出错:", error);
    toastr.error(
      `${translations[currentLang]["push_failed"]}: ${error.message}`
    );
  }
}

/**
 * @description 过滤掉角色卡中不必要的字段，以确保上传的数据结构与预期一致。
 * @param {object} characterData - 原始角色数据对象。
 * @returns {object} - 过滤后的角色数据对象。
 */
function filterCharacterData(characterData) {
  const filteredData = { ...characterData };
  delete filteredData.chat;
  delete filteredData.json_data;
  delete filteredData.date_added;
  delete filteredData.chat_size;
  delete filteredData.date_last_chat;
  delete filteredData.data_size;
  return filteredData;
}

async function onPullClick() {
  const character = characters[this_chid];
  if (!character) {
    toastr.warning(translations[currentLang]["load_character_first"]);
    return;
  }
  const extensionData = currentQirosData;
  const repoUrl = extensionData?.upstreamUrl || extensionData?.repoUrl;
  if (!repoUrl) {
    toastr.warning(translations[currentLang]["no_repo_linked"]);
    return;
  }
  const branch = branchSelect.val();
  if (!branch) {
    toastr.warning(translations[currentLang]["select_branch"]);
    return;
  }

  const confirmation = await Popup.show.confirm(
    `<p>${translations[currentLang]["pull_confirm_text"]}</p><p><strong>${translations[currentLang]["this_is_destructive"]}</strong></p>`,
    null,
    {
      okButton: translations[currentLang]["proceed"],
      cancelButton: translations[currentLang]["cancel"],
    }
  );

  if (confirmation === POPUP_RESULT.AFFIRMATIVE) {
    await proceedWithPull(repoUrl, branch, character.avatar);
  }
}

async function proceedWithPull(repoUrl, branch, characterAvatar) {
  toastr.info(`${translations[currentLang]["pulling_from"]} ${branch}...`);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const params = new URLSearchParams({
      repoUrl,
      branch,
      characterAvatar: characterAvatar.split("/").pop(),
    });
    const response = await fetch(
      `/api/plugins/qiros-server/download_card?${params.toString()}`,
      { method: "GET", headers: { "X-CSRF-Token": csrfToken } }
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.details || translations[currentLang]["pull_failed"]
      );
    toastr.success(translations[currentLang]["pull_successful"]);
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error("拉取角色卡时出错:", error);
    toastr.error(
      `${translations[currentLang]["pull_failed"]}: ${error.message}`
    );
  }
}

async function onCheckUpdatesClick() {
  const character = characters[this_chid];
  if (!character) {
    toastr.warning(translations[currentLang]["load_character_first"]);
    return;
  }
  const extensionData = currentQirosData;
  const repoUrl = extensionData?.upstreamUrl || extensionData?.repoUrl;
  if (!repoUrl) {
    toastr.warning(translations[currentLang]["no_repo_linked"]);
    return;
  }
  const branch = branchSelect.val();
  if (!branch) {
    toastr.warning(translations[currentLang]["select_branch"]);
    return;
  }
  toastr.info(translations[currentLang]["checking_for_updates"]);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const params = new URLSearchParams({ repoUrl, branch });
    const response = await fetch(
      `/api/plugins/qiros-server/check_updates?${params.toString()}`,
      { method: "GET", headers: { "X-CSRF-Token": csrfToken } }
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.details || translations[currentLang]["update_check_failed"]
      );

    const remoteSha = result.remoteSha;
    const localSha = currentQirosData?.commitSha ?? "";

    if (localSha && remoteSha.startsWith(localSha)) {
      toastr.success(translations[currentLang]["already_latest_version"]);
    } else {
      toastr.info(
        `${translations[currentLang]["new_version_found"]} <br><b>${
          translations[currentLang]["remote"]
        }:</b> ${remoteSha.substring(0, 7)} <br><b>${
          translations[currentLang]["local"]
        }:</b> ${localSha.substring(0, 7)}`
      );
    }
  } catch (error) {
    console.error("检查更新时出错:", error);
    toastr.error(
      `${translations[currentLang]["update_check_failed"]}: ${error.message}`
    );
  }
}

/**
 * =================================================================
 * 高级功能 (历史、回滚、发布)
 * =================================================================
 */

function onHistoryButtonClick() {
  if (historyDetailsSection.is(":visible")) {
    historyDetailsSection.hide();
  } else {
    historyDetailsSection.show();
    loadHistory();
  }
}

async function loadHistory() {
  const extensionData = currentQirosData;
  const repoUrl =
    extensionData?.forkUrl ||
    extensionData?.upstreamUrl ||
    extensionData?.repoUrl;
  if (!repoUrl || !branchSelect.val()) {
    historyList.html(
      `<p>${translations[currentLang]["no_repo_or_branch"]}</p>`
    );
    return;
  }
  historyList.html(`<p>${translations[currentLang]["loading_history"]}</p>`);
  revertButton.prop("disabled", true);
  selectedCommitSha = null;
  historyDiffContainer.hide();
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const params = new URLSearchParams({
      repoUrl: repoUrl,
      branch: branchSelect.val(),
      file: "character.json",
    });
    const response = await fetch(
      `/api/plugins/qiros-server/history?${params.toString()}`,
      { headers: { "X-CSRF-Token": csrfToken } }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        err.details || translations[currentLang]["history_load_failed"]
      );
    }
    const data = await response.json();
    renderHistory(data.history);
  } catch (error) {
    console.error("加载历史记录时出错:", error);
    historyList.html(
      `<p class="error">${translations[currentLang]["history_load_failed"]}: ${error.message}</p>`
    );
  }
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.html(`<p>${translations[currentLang]["no_history_found"]}</p>`);
    return;
  }
  historyList.empty();
  history.forEach((commit) => {
    const commitDate = new Date(commit.date).toLocaleString();
    const commitElement = $(`
      <div class="history-item" data-sha="${commit.hash}">
        <div class="history-sha">${commit.hash.substring(0, 7)}</div>
        <div class="history-message">${commit.message}</div>
        <div class="history-author">${commit.author}</div>
        <div class="history-date">${commitDate}</div>
      </div>
    `);
    commitElement.on("click", function () {
      const sha = $(this).data("sha");
      if ($(this).hasClass("selected")) {
        $(this).removeClass("selected");
        selectedCommitSha = null;
        revertButton.prop("disabled", true);
        historyDiffContainer.hide();
      } else {
        $(".history-item.selected").removeClass("selected");
        $(this).addClass("selected");
        selectedCommitSha = sha;
        revertButton.prop("disabled", false);
        loadDiff(sha);
      }
    });
    historyList.append(commitElement);
  });
}

async function onRevertClick() {
  if (!selectedCommitSha) {
    toastr.warning(translations[currentLang]["select_version_to_revert"]);
    return;
  }

  const confirmation = await Popup.show.confirm(
    `<p>${translations[currentLang]["revert_confirm"](
      selectedCommitSha.substring(0, 7)
    )}</p>`,
    null,
    {
      okButton: translations[currentLang]["proceed"],
      cancelButton: translations[currentLang]["cancel"],
    }
  );

  if (confirmation === POPUP_RESULT.AFFIRMATIVE) {
    await proceedWithRevert();
  }
}

async function proceedWithRevert() {
  toastr.info(translations[currentLang]["reverting_version"]);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const extensionData = currentQirosData;
    const repoUrl =
      extensionData?.forkUrl ||
      extensionData?.upstreamUrl ||
      extensionData?.repoUrl;
    const response = await fetch("/api/plugins/qiros-server/revert_version", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        repoUrl: repoUrl,
        branch: branchSelect.val(),
        targetCommitSha: selectedCommitSha,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.details || translations[currentLang]["revert_failed"]
      );

    toastr.success(result.message);

    // 从后端获取回滚后的数据
    const { cardPngContent } = result.data;

    // 核心逻辑：只使用 card.png 来更新角色
    if (cardPngContent) {
      const byteCharacters = atob(cardPngContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });

      const formData = new FormData();
      formData.append("avatar", blob, "card.png");
      formData.append("file_type", "png");
      // 使用 preserved_name 确保覆盖的是当前角色
      formData.append(
        "preserved_name",
        characters[this_chid].avatar.split("/").pop()
      );

      const importResponse = await fetch("/api/characters/import", {
        method: "POST",
        body: formData,
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        throw new Error(`SillyTavern 导入失败: ${errorText}`);
      }

      // 成功后刷新页面
      toastr.success(translations[currentLang]["revert_successful_reloading"]);
      setTimeout(() => window.location.reload(), 2000);
    } else {
      // 如果由于某种原因没有card.png，则只刷新历史记录
      toastr.info(
        "JSON data has been reverted. No card found for this version. Please pull to see changes."
      );
      revertButton.prop("disabled", true);
      selectedCommitSha = null;
      $(".history-item.selected").removeClass("selected");
      historyDiffContainer.hide();
      loadHistory();
    }
  } catch (error) {
    console.error("回滚版本时出错:", error);
    toastr.error(
      `${translations[currentLang]["revert_failed"]}: ${error.message}`
    );
  }
}

async function loadDiff(sha) {
  historyDiffContainer.show();
  historyDiffView.text(translations[currentLang]["loading_diff"]);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const extensionData = currentQirosData;
    const repoUrl =
      extensionData?.forkUrl ||
      extensionData?.upstreamUrl ||
      extensionData?.repoUrl;
    const params = new URLSearchParams({
      repoUrl: repoUrl,
      sha: sha,
      file: "character.json",
    });
    const response = await fetch(
      `/api/plugins/qiros-server/commit_diff?${params.toString()}`,
      { headers: { "X-CSRF-Token": csrfToken } }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        err.details || translations[currentLang]["diff_load_failed"]
      );
    }
    const data = await response.json();
    renderDiff(data.patch);
  } catch (error) {
    console.error("加载差异时出错:", error);
    historyDiffView.text(
      `${translations[currentLang]["diff_load_failed"]}: ${error.message}`
    );
  }
}

function renderDiff(patch) {
  if (!patch) {
    historyDiffView.text(translations[currentLang]["no_changes_found"]);
    return;
  }
  const lines = patch.split("\n");
  const formattedLines = lines
    .map((line) => {
      let className = "";
      if (line.startsWith("+")) className = "diff-added";
      else if (line.startsWith("-")) className = "diff-removed";
      else if (line.startsWith("@@")) className = "diff-header";
      return `<span class="${className}">${line}</span>`;
    })
    .join("\n");
  historyDiffView.html(formattedLines);
}

async function onReleaseClick() {
  if (!this_chid) {
    toastr.warning(translations[currentLang]["select_character_first"]);
    return;
  }
  const extensionData = currentQirosData;
  const repoUrl =
    extensionData?.forkUrl ||
    extensionData?.upstreamUrl ||
    extensionData?.repoUrl;
  if (!repoUrl) {
    toastr.warning(translations[currentLang]["no_repo_linked"]);
    return;
  }
  const branch = branchSelect.val();
  if (!branch) {
    toastr.warning(translations[currentLang]["select_branch"]);
    return;
  }

  const popup = new Popup(
    `<h3 data-i18n="create_new_release_popup">${translations[currentLang]["create_new_release_popup"]}</h3>`,
    POPUP_TYPE.INPUT,
    "",
    {
      okButton: translations[currentLang]["create"],
      cancelButton: translations[currentLang]["cancel"],
      rows: 4,
      customInputs: [
        {
          id: "qiros_release_version",
          label: translations[currentLang]["version_tag"],
          type: "text",
          tooltip: "e.g., v1.0.0",
          defaultState: "v1.0.0",
        },
        {
          id: "qiros_release_title",
          label: translations[currentLang]["release_title"],
          type: "text",
          tooltip: translations[currentLang]["release_title_placeholder"],
        },
      ],
    }
  );
  popup.mainInput.placeholder =
    translations[currentLang]["release_notes_placeholder"];

  const result = await popup.show();

  if (result === null || result === false) {
    return; // User cancelled
  }

  const notes = popup.mainInput.value;
  const version = popup.inputResults.get("qiros_release_version").trim();
  const title = popup.inputResults.get("qiros_release_title").trim();

  if (!version || !title) {
    toastr.warning(translations[currentLang]["version_and_title_required"]);
    return;
  }
  await proceedWithRelease(repoUrl, branch, version, title, notes);
}

async function proceedWithRelease(
  repoUrl,
  targetBranch,
  version,
  title,
  notes
) {
  toastr.info(translations[currentLang]["creating_release"]);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const response = await fetch("/api/plugins/qiros-server/create_release", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ repoUrl, version, title, notes, targetBranch }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.details || translations[currentLang]["release_failed"]
      );
    toastr.success(result.message);

    // 将发行版号写入角色卡的 character_version 字段
    if (characters[this_chid] && characters[this_chid].data) {
      characters[this_chid].data.character_version = version;
      // 调用 saveExtensionData 来触发角色卡数据的保存
      // 假设 writeExtensionField 会触发整个角色卡文件的保存
      await saveExtensionData({});
      console.log(`[Qiros Debug] Character version updated to: ${version}`);
    }
  } catch (error) {
    console.error("创建发行版时出错:", error);
    toastr.error(
      `${translations[currentLang]["release_failed"]}: ${error.message}`
    );
  }
}

async function onNewBranchClick() {
  const extensionData = currentQirosData;
  const repoUrl =
    extensionData?.forkUrl ||
    extensionData?.upstreamUrl ||
    extensionData?.repoUrl;
  if (!repoUrl) {
    toastr.warning(translations[currentLang]["no_repo_linked"]);
    return;
  }
  const newBranchName = await Popup.show.input(
    translations[currentLang]["create_new_branch"],
    translations[currentLang]["enter_branch_name"]
  );

  if (!newBranchName) {
    return; // User cancelled
  }

  toastr.info(
    `${translations[currentLang]["creating_branch"]} "${newBranchName}"...`
  );

  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;

    const response = await fetch("/api/plugins/qiros-server/create_branch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        repoUrl: repoUrl,
        newBranchName: newBranchName,
        baseBranch: branchSelect.val() || null,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.details || translations[currentLang]["branch_creation_failed"]
      );
    }

    toastr.success(
      `${translations[currentLang]["branch"]} "${newBranchName}" ${translations[currentLang]["created_successfully"]}`
    );
    await updateBranchView(repoUrl);
    branchSelect.val(newBranchName);
  } catch (error) {
    console.error("Error creating new branch:", error);
    toastr.error(
      `${translations[currentLang]["branch_creation_failed"]}: ${error.message}`
    );
  }
}

async function onForkClick() {
  const extensionData = currentQirosData;
  let upstreamUrl = extensionData?.upstreamUrl;

  if (!upstreamUrl) {
    // 如果没有上游仓库，则弹窗让用户输入
    const inputUrl = await Popup.show.input(
      translations[currentLang]["enter_upstream_repo_url"],
      translations[currentLang]["upstream_repo_url_placeholder"],
      ""
    );
    if (inputUrl === null) return; // 用户取消
    upstreamUrl = inputUrl.trim();
    if (
      !upstreamUrl.match(
        /^https:\/\/github\.com\/[a-zA-Z0-9-_\.]+\/[a-zA-Z0-9-_\.]+(\.git)?$/i
      )
    ) {
      toastr.warning(translations[currentLang]["invalid_repo_url"]);
      return;
    }
    // 临时保存上游URL，以便后续操作
    await saveExtensionData({ upstreamUrl: upstreamUrl });
  }

  const confirmation = await Popup.show.confirm(
    translations[currentLang]["fork_confirm_text"]
  );
  if (confirmation !== POPUP_RESULT.AFFIRMATIVE) return;

  toastr.info(translations[currentLang]["forking_repo"]);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;
    const response = await fetch("/api/plugins/qiros-server/fork", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ upstreamRepoUrl: upstreamUrl }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.details || translations[currentLang]["fork_failed"]
      );

    const forkUrl = result.details.clone_url;
    await saveExtensionData({ forkUrl });
    updateRepoView(currentQirosData);
    toastr.success(translations[currentLang]["fork_successful"]);
  } catch (error) {
    console.error("Forking repository failed:", error);
    toastr.error(
      `${translations[currentLang]["fork_failed"]}: ${error.message}`
    );
  }
}

async function onCreatePullRequestClick() {
  const extensionData = currentQirosData;
  const { upstreamUrl, forkUrl } = extensionData;
  const headBranch = branchSelect.val();

  if (!upstreamUrl || !forkUrl || !headBranch) {
    toastr.warning(translations[currentLang]["no_upstream_fork_branch"]);
    return;
  }

  const prTitle = await Popup.show.input(translations[currentLang]["pr_title"]);
  if (!prTitle) return;

  const prBody = await Popup.show.input(
    translations[currentLang]["pr_body"],
    null,
    "",
    { rows: 5 }
  );
  if (prBody === null) return;

  toastr.info(translations[currentLang]["creating_pr"]);
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;

    const response = await fetch("/api/plugins/qiros-server/pull-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        upstreamRepoUrl: upstreamUrl,
        headBranch: `${currentUser.login}:${headBranch}`,
        baseBranch: "main",
        title: prTitle,
        body: prBody,
      }),
    });

    const result = await response.json();
    if (!response.ok)
      throw new Error(result.details || translations[currentLang]["pr_failed"]);

    toastr.success(
      `${translations[currentLang]["pr_successful"]} <a href="${result.details.html_url}" target="_blank">View it here.</a>`
    );
  } catch (error) {
    console.error("Creating Pull Request failed:", error);
    toastr.error(`${translations[currentLang]["pr_failed"]}: ${error.message}`);
  }
}

/**
 * =================================================================
 * 插件入口与初始化
 * =================================================================
 */
function onPanelShown() {
  loginView = $("#qiros-login-view");
  mainView = $("#qiros-main-view");
  userInfoContainer = $("#user-info-container");
  userAvatar = $("#user-avatar");
  userLogin = $("#user-login");
  langSelect = $("#qiros-lang-select");
  repoManagementContainer = $("#repo-management-container");
  upstreamRepoUrlDisplay = $("#upstream-repo-url-display");
  forkRepoUrlDisplay = $("#fork-repo-url-display");
  forkRepoButton = $("#fork-repo-button");
  unlinkRepoButton = $("#unlink-repo-button");
  createPrButton = $("#create-pr-button");
  repoUrlInput = $("#repo-url-input");
  associateRepoButton = $("#associate-repo-button");
  createRepoButton = $("#create-repo-button");
  characterVersionDisplay = $("#character-version-display");
  branchManagementContainer = $("#branch-management-container");
  branchSelect = $("#branch-select");
  newBranchButton = $("#new-branch-button");
  checkUpdatesButton = $("#check-updates-button");
  pullButton = $("#pull-button");
  commitMessageInput = $("#commit-message");
  pushButton = $("#push-button");
  pushTargetContainer = $("#push-target-container");
  pushTargetSelect = $("#push-target-select");
  historyButton = $("#history-button");
  releaseButton = $("#release-button");
  historyDetailsSection = $("#history-details-section");
  historyList = $("#history-list");
  revertButton = $("#revert-button");
  historyDiffContainer = $("#history-diff-container");
  historyDiffView = $("#history-diff-view");

  langSelect.on("change", () => setLanguage(langSelect.val()));
  $("#github-login-button").on("click", onLoginClick);
  $("#github-logout-button").on("click", onLogoutClick);
  associateRepoButton.on("click", onAssociateRepoClick);
  createRepoButton.on("click", onCreateRepoClick);
  checkUpdatesButton.on("click", onCheckUpdatesClick);
  pullButton.on("click", onPullClick);
  pushButton.on("click", onPushClick);
  historyButton.on("click", onHistoryButtonClick);
  releaseButton.on("click", onReleaseClick);
  revertButton.on("click", onRevertClick);
  newBranchButton.on("click", onNewBranchClick);
  forkRepoButton.on("click", onForkClick);
  createPrButton.on("click", onCreatePullRequestClick);
  unlinkRepoButton.on("click", onUnlinkRepoClick);

  eventSource.on(event_types.CHAT_CHANGED, refreshCharacterView);

  (async () => {
    try {
      const response = await fetch("/api/plugins/qiros-server/user");
      if (response.status === 401 || response.status === 403) {
        updateViewState(null);
        return;
      }
      if (!response.ok) {
        updateViewState(null);
        return;
      }
      const user = await response.json();
      updateViewState(user);
    } catch (error) {
      console.error("获取用户状态失败:", error);
      updateViewState(null);
    }
  })();

  setLanguage("zh");
  langSelect.val("zh");
}

jQuery(async () => {
  try {
    const settingsHtmlPath = `${extensionFolderPath}/settings.html`;
    const settingsHtml = await $.get(settingsHtmlPath);
    $("#extensions_settings").append(settingsHtml);
    onPanelShown();
    console.log(`[${extensionName}] 插件初始化成功。`);
  } catch (error) {
    console.error(`[${extensionName}] 初始化过程中出错:`, error);
    toastr.error(translations[currentLang]["plugin_init_failed"] + error);
  }
});
