/**
 * Nova Meet - Core Client Logic v2.6
 * Permanent Profile Photo Upload, WebRTC Audio, Annotations, Chat, AI Summary & Soundboard
 */

// Application State
const state = {
  theme: localStorage.getItem('nova_theme') || 'light',
  currentTab: 'meetings', // 'meetings' | 'calls' | 'stories'
  user: {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: (localStorage.getItem('nova_user_name') || 'You').replace(/\s*\(Host\)/g, '').trim() || 'You',
    initials: 'ME',
    avatar: localStorage.getItem('nova_user_avatar') || null,
    status: localStorage.getItem('nova_user_status') || 'available',
    story: JSON.parse(localStorage.getItem('nova_user_story') || 'null'),
    isMuted: false,
    isScreenSharing: false,
    isPushToTalking: false,
  },
  activeRoom: null,
  isRoomLocked: false,
  callTimerInterval: null,
  callSeconds: 0,
  localAudioStream: null,
  localScreenStream: null,
  audioContext: null,
  analyser: null,
  animFrameId: null,
  uploadedPhotoDataUrl: null,
  deferredInstallPrompt: null,

  // Real-time & Participants
  participants: [],
  pendingKickUserId: null,
  realtimeChannel: null,
  sseSource: null,
  lastSpeakingBroadcastTime: 0,

  // Annotation Tool State
  annotation: {
    tool: 'pen',
    color: '#ef4444',
    isDrawing: false,
    lastX: 0,
    lastY: 0
  },

  // Built-in Contacts
  contacts: [
    {
      id: 'contact_1',
      name: 'Rafid Karim',
      handle: '@rafid.dev',
      initials: 'RK',
      color: 'from-amber-500 to-orange-600',
      status: 'In Huddle',
      statusColor: 'bg-emerald-500',
      note: 'Debugging WebRTC voice ⚡',
      room: 'nova-dev',
      inCall: true
    },
    {
      id: 'contact_2',
      name: 'Ayesha Khan',
      handle: '@ayesha.ui',
      initials: 'AK',
      color: 'from-pink-500 to-rose-600',
      status: 'Online',
      statusColor: 'bg-emerald-500',
      note: 'Coffee break & thinking ☕',
      room: null,
      inCall: false
    },
    {
      id: 'contact_3',
      name: 'Tanvir Hossain',
      handle: '@tanvir.arch',
      initials: 'TH',
      color: 'from-cyan-500 to-blue-600',
      status: 'In Huddle',
      statusColor: 'bg-emerald-500',
      note: 'Reviewing slides & docs 📑',
      room: 'design-sync',
      inCall: true
    },
    {
      id: 'contact_4',
      name: 'Nafis Iqbal',
      handle: '@nafis.iqbal',
      initials: 'NI',
      color: 'from-emerald-500 to-teal-600',
      status: 'Available',
      statusColor: 'bg-emerald-500',
      note: 'Late night study session 📚',
      room: null,
      inCall: false
    }
  ],

  // Built-in Stories
  stories: [
    {
      id: 'story_1',
      author: 'Rafid Karim',
      initials: 'RK',
      color: 'from-amber-500 to-orange-600',
      note: 'Debugging WebRTC voice ⚡',
      photo: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      timeAgo: '25m ago',
      inHuddle: true,
      room: 'nova-dev'
    },
    {
      id: 'story_2',
      author: 'Ayesha Khan',
      initials: 'AK',
      color: 'from-pink-500 to-rose-600',
      note: 'Coffee break & thinking ☕',
      photo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
      timeAgo: '1h ago',
      inHuddle: false,
      room: null
    },
    {
      id: 'story_3',
      author: 'Tanvir Hossain',
      initials: 'TH',
      color: 'from-cyan-500 to-blue-600',
      note: 'Reviewing slides & docs 📑',
      photo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
      timeAgo: '3h ago',
      inHuddle: true,
      room: 'design-sync'
    },
    {
      id: 'story_4',
      author: 'Nafis Iqbal',
      initials: 'NI',
      color: 'from-emerald-500 to-teal-600',
      note: 'Late night study session 📚',
      photo: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
      timeAgo: '5h ago',
      inHuddle: false,
      room: null
    }
  ]
};

// DOM References
const DOM = {
  // Navigation Tabs & Views
  navMeetingsBtn: document.getElementById('navMeetingsBtn'),
  navMeetingsPill: document.getElementById('navMeetingsPill'),
  navCallsBtn: document.getElementById('navCallsBtn'),
  navCallsPill: document.getElementById('navCallsPill'),
  navStoriesBtn: document.getElementById('navStoriesBtn'),
  navStoriesPill: document.getElementById('navStoriesPill'),

  dashboardView: document.getElementById('dashboardView'),
  callsView: document.getElementById('callsView'),
  storiesView: document.getElementById('storiesView'),
  inCallView: document.getElementById('inCallView'),

  // Drawer Menu
  sidebarMenuToggle: document.getElementById('sidebarMenuToggle'),
  sideDrawerMenu: document.getElementById('sideDrawerMenu'),
  sideDrawerOverlay: document.getElementById('sideDrawerOverlay'),
  closeSideDrawerBtn: document.getElementById('closeSideDrawerBtn'),

  // Profile & Avatars
  userProfileBtn: document.getElementById('userProfileBtn'),
  userProfilePopover: document.getElementById('userProfilePopover'),
  popoverNameInput: document.getElementById('popoverNameInput'),
  headerStatusDot: document.getElementById('headerStatusDot'),
  popoverNoteDisplay: document.getElementById('popoverNoteDisplay'),
  saveProfileBtn: document.getElementById('saveProfileBtn'),
  profileSoundToggle: document.getElementById('profileSoundToggle'),
  userAvatarFileInput: document.getElementById('userAvatarFileInput'),
  removeAvatarBtn: document.getElementById('removeAvatarBtn'),

  headerAvatarImg: document.getElementById('headerAvatarImg'),
  userAvatarInitials: document.getElementById('userAvatarInitials'),
  popoverAvatarImg: document.getElementById('popoverAvatarImg'),
  popoverAvatarInitials: document.getElementById('popoverAvatarInitials'),
  storySelfAvatarImg: document.getElementById('storySelfAvatarImg'),
  storySelfInitials: document.getElementById('storySelfInitials'),
  selfSpeakerAvatarImg: document.getElementById('selfSpeakerAvatarImg'),
  selfSpeakerInitials: document.getElementById('selfSpeakerInitials'),
  selfSpeakerNameLabel: document.getElementById('selfSpeakerNameLabel'),

  // PWA Install
  installPwaBtn: document.getElementById('installPwaBtn'),

  // Header
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  liveClockDisplay: document.getElementById('liveClockDisplay'),
  micMeterPill: document.getElementById('micMeterPill'),
  micVolumeBar: document.getElementById('micVolumeBar'),
  joinMeetingInput: document.getElementById('joinMeetingInput'),
  joinMeetingBtn: document.getElementById('joinMeetingBtn'),
  newMeetingBtn: document.getElementById('newMeetingBtn'),
  newMeetingDropdown: document.getElementById('newMeetingDropdown'),
  instantAudioHuddleOption: document.getElementById('instantAudioHuddleOption'),
  createMeetingForLaterOption: document.getElementById('createMeetingForLaterOption'),
  scheduleMeetingOption: document.getElementById('scheduleMeetingOption'),
  shortcutsModalBtn: document.getElementById('shortcutsModalBtn'),

  // Contacts
  contactsListContainer: document.getElementById('contactsListContainer'),
  contactSearchInput: document.getElementById('contactSearchInput'),

  // Stories
  storiesCarousel: document.getElementById('storiesCarousel'),
  storiesGridContainer: document.getElementById('storiesGridContainer'),
  createStoryCardTrigger: document.getElementById('createStoryCardTrigger'),
  openCreateStoryModalBtn: document.getElementById('openCreateStoryModalBtn'),
  selfCurrentNotePill: document.getElementById('selfCurrentNotePill'),

  // Create Story Modal
  createStoryModal: document.getElementById('createStoryModal'),
  closeCreateStoryModalBtn: document.getElementById('closeCreateStoryModalBtn'),
  cancelCreateStoryBtn: document.getElementById('cancelCreateStoryBtn'),
  publishStoryBtn: document.getElementById('publishStoryBtn'),
  photoUploadDropzone: document.getElementById('photoUploadDropzone'),
  storyPhotoInput: document.getElementById('storyPhotoInput'),
  storyPhotoPreview: document.getElementById('storyPhotoPreview'),
  storyPhotoPreviewOverlay: document.getElementById('storyPhotoPreviewOverlay'),
  storyUploadPlaceholder: document.getElementById('storyUploadPlaceholder'),
  createStoryNoteInput: document.getElementById('createStoryNoteInput'),
  createNoteCharCounter: document.getElementById('createNoteCharCounter'),

  // Story Viewer Modal
  storyViewerModal: document.getElementById('storyViewerModal'),
  closeStoryViewerBtn: document.getElementById('closeStoryViewerBtn'),
  viewerProgressBar: document.getElementById('viewerProgressBar'),
  viewerAvatar: document.getElementById('viewerAvatar'),
  viewerAvatarRing: document.getElementById('viewerAvatarRing'),
  viewerAuthorName: document.getElementById('viewerAuthorName'),
  viewerTimeAgo: document.getElementById('viewerTimeAgo'),
  viewerImage: document.getElementById('viewerImage'),
  viewerCaptionText: document.getElementById('viewerCaptionText'),
  viewerJoinHuddleBtn: document.getElementById('viewerJoinHuddleBtn'),
  viewerCallButtonLabel: document.getElementById('viewerCallButtonLabel'),

  // In-Call Elements & Grid
  speakerTilesGrid: document.getElementById('speakerTilesGrid'),
  callRoomCodeBadge: document.getElementById('callRoomCodeBadge'),
  bottomMeetingCode: document.getElementById('bottomMeetingCode'),
  callDuration: document.getElementById('callDuration'),
  copyCallLinkBtn: document.getElementById('copyCallLinkBtn'),
  callSidePanel: document.getElementById('callSidePanel'),

  // Side Panel Tabs
  tabPeopleBtn: document.getElementById('tabPeopleBtn'),
  peopleCountBadge: document.getElementById('peopleCountBadge'),
  sidePanelPeopleContent: document.getElementById('sidePanelPeopleContent'),
  sidePanelPeopleCount: document.getElementById('sidePanelPeopleCount'),
  peopleListContainer: document.getElementById('peopleListContainer'),

  tabNotesBtn: document.getElementById('tabNotesBtn'),
  tabChatBtn: document.getElementById('tabChatBtn'),
  chatUnreadDot: document.getElementById('chatUnreadDot'),
  sidePanelNotesContent: document.getElementById('sidePanelNotesContent'),
  sidePanelChatContent: document.getElementById('sidePanelChatContent'),
  callNotesTextarea: document.getElementById('callNotesTextarea'),
  callNotesCharCount: document.getElementById('callNotesCharCount'),
  downloadScratchpadBtn: document.getElementById('downloadScratchpadBtn'),

  // Modals for Kick, Invite, Alert
  inviteTeammatesModal: document.getElementById('inviteTeammatesModal'),
  inviteLinkInput: document.getElementById('inviteLinkInput'),
  copyInviteLinkModalBtn: document.getElementById('copyInviteLinkModalBtn'),
  quickAddTeammatesList: document.getElementById('quickAddTeammatesList'),
  kickConfirmModal: document.getElementById('kickConfirmModal'),
  kickTargetUserName: document.getElementById('kickTargetUserName'),
  confirmKickBtn: document.getElementById('confirmKickBtn'),
  kickedAlertModal: document.getElementById('kickedAlertModal'),

  // Chat
  chatMessagesContainer: document.getElementById('chatMessagesContainer'),
  chatTextInput: document.getElementById('chatTextInput'),
  chatFileInput: document.getElementById('chatFileInput'),
  sendChatBtn: document.getElementById('sendChatBtn'),

  // Room Lock & Knocking
  roomLockBtn: document.getElementById('roomLockBtn'),
  roomLockIcon: document.getElementById('roomLockIcon'),
  roomLockText: document.getElementById('roomLockText'),
  knockingToast: document.getElementById('knockingToast'),
  knockingUserName: document.getElementById('knockingUserName'),
  admitKnockBtn: document.getElementById('admitKnockBtn'),
  denyKnockBtn: document.getElementById('denyKnockBtn'),

  // Controls & Soundboard
  callMicToggleBtn: document.getElementById('callMicToggleBtn'),
  callScreenShareToggleBtn: document.getElementById('callScreenShareToggleBtn'),
  dockSoundboardBtn: document.getElementById('dockSoundboardBtn'),
  soundboardMenu: document.getElementById('soundboardMenu'),
  callReactionsBtn: document.getElementById('callReactionsBtn'),
  callReactionsMenu: document.getElementById('callReactionsMenu'),
  callLeaveBtn: document.getElementById('callLeaveBtn'),
  callTopLeaveBtn: document.getElementById('callTopLeaveBtn'),

  // AI Summary
  generateAiSummaryBtn: document.getElementById('generateAiSummaryBtn'),
  aiSummaryModal: document.getElementById('aiSummaryModal'),
  closeAiSummaryBtn: document.getElementById('closeAiSummaryBtn'),
  aiSummaryContent: document.getElementById('aiSummaryContent'),
  copyAiSummaryBtn: document.getElementById('copyAiSummaryBtn'),
  exportAiSummaryBtn: document.getElementById('exportAiSummaryBtn'),

  // Screen Share & Annotation
  screenShareContainer: document.getElementById('screenShareContainer'),
  screenVideoPlayer: document.getElementById('screenVideoPlayer'),
  annotationCanvas: document.getElementById('annotationCanvas'),
  laserPointerDot: document.getElementById('laserPointerDot'),
  annotationToolbar: document.getElementById('annotationToolbar'),
  toolPenBtn: document.getElementById('toolPenBtn'),
  toolLaserBtn: document.getElementById('toolLaserBtn'),
  clearAnnotationBtn: document.getElementById('clearAnnotationBtn'),
  stopShareOverlayBtn: document.getElementById('stopShareOverlayBtn'),
  fullscreenScreenBtn: document.getElementById('fullscreenScreenBtn'),

  // Audio Visualizer
  selfSpeakerCard: document.getElementById('selfSpeakerCard'),
  selfRipple1: document.getElementById('selfRipple1'),
  selfRipple2: document.getElementById('selfRipple2'),
  selfMicIcon: document.getElementById('selfMicIcon'),
  pushToTalkToast: document.getElementById('pushToTalkToast'),
  emptyStateStartHuddleBtn: document.getElementById('emptyStateStartHuddleBtn'),
  flyingReactionsContainer: document.getElementById('flyingReactionsContainer'),
};

// ================= PERMANENT PROFILE PHOTO SYSTEM =================
function updateUserAvatar(dataUrl) {
  state.user.avatar = dataUrl;

  if (dataUrl) {
    localStorage.setItem('nova_user_avatar', dataUrl);

    // Update Header Avatar
    DOM.headerAvatarImg.src = dataUrl;
    DOM.headerAvatarImg.classList.remove('hidden');
    DOM.userAvatarInitials.classList.add('hidden');

    // Update Popover Avatar
    DOM.popoverAvatarImg.src = dataUrl;
    DOM.popoverAvatarImg.classList.remove('hidden');
    DOM.popoverAvatarInitials.classList.add('hidden');

    // Update Home Add Story Avatar
    DOM.storySelfAvatarImg.src = dataUrl;
    DOM.storySelfAvatarImg.classList.remove('hidden');
    DOM.storySelfInitials.classList.add('hidden');

    // Update In-Call Speaker Avatar
    if (DOM.selfSpeakerAvatarImg) {
      DOM.selfSpeakerAvatarImg.src = dataUrl;
      DOM.selfSpeakerAvatarImg.classList.remove('hidden');
      DOM.selfSpeakerInitials.classList.add('hidden');
    }

    // Update PiP Avatar
    const pipAvatarImg = document.getElementById('pipAvatarImg');
    const pipAvatarInitials = document.getElementById('pipAvatarInitials');
    if (pipAvatarImg && pipAvatarInitials) {
      pipAvatarImg.src = dataUrl;
      pipAvatarImg.classList.remove('hidden');
      pipAvatarInitials.classList.add('hidden');
    }

    const selfP = state.participants.find(p => p.id === state.user.id);
    if (selfP) selfP.avatar = dataUrl;
    if (state.activeRoom) {
      renderSpeakerTiles();
      renderPeopleList();
    }

    DOM.removeAvatarBtn.classList.remove('hidden');
  } else {
    localStorage.removeItem('nova_user_avatar');

    DOM.headerAvatarImg.classList.add('hidden');
    DOM.headerAvatarImg.src = '';
    DOM.userAvatarInitials.classList.remove('hidden');

    DOM.popoverAvatarImg.classList.add('hidden');
    DOM.popoverAvatarImg.src = '';
    DOM.popoverAvatarInitials.classList.remove('hidden');

    DOM.storySelfAvatarImg.classList.add('hidden');
    DOM.storySelfAvatarImg.src = '';
    DOM.storySelfInitials.classList.remove('hidden');

    if (DOM.selfSpeakerAvatarImg) {
      DOM.selfSpeakerAvatarImg.classList.add('hidden');
      DOM.selfSpeakerAvatarImg.src = '';
      DOM.selfSpeakerInitials.classList.remove('hidden');
    }

    const pipAvatarImg = document.getElementById('pipAvatarImg');
    const pipAvatarInitials = document.getElementById('pipAvatarInitials');
    if (pipAvatarImg && pipAvatarInitials) {
      pipAvatarImg.classList.add('hidden');
      pipAvatarImg.src = '';
      pipAvatarInitials.classList.remove('hidden');
    }

    const selfP = state.participants.find(p => p.id === state.user.id);
    if (selfP) selfP.avatar = null;
    if (state.activeRoom) {
      renderSpeakerTiles();
      renderPeopleList();
    }

    DOM.removeAvatarBtn.classList.add('hidden');
  }

  renderStories();
}

DOM.userAvatarFileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      updateUserAvatar(event.target.result);
      playSound('pop');
    };
    reader.readAsDataURL(file);
  }
};

DOM.removeAvatarBtn.onclick = () => {
  updateUserAvatar(null);
  playSound('pop');
};

// ================= TAB NAVIGATION =================
function switchMainTab(tab, bypassPip = false) {
  // If active huddle in progress and user navigates, smoothly collapse into Mini PiP!
  if (state.activeRoom && !bypassPip && !isPipActive) {
    enterPipMode();
    state.currentTab = tab;
  }

  state.currentTab = tab;
  playSound('click');

  [DOM.navMeetingsPill, DOM.navCallsPill, DOM.navStoriesPill].forEach(pill => {
    if (pill) pill.className = 'w-11 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-all text-google-subtext dark:text-dark-subtext';
  });
  [DOM.navMeetingsBtn, DOM.navCallsBtn, DOM.navStoriesBtn].forEach(btn => {
    if (btn) btn.classList.remove('nav-tab-active');
  });

  DOM.dashboardView.classList.add('hidden');
  DOM.callsView.classList.add('hidden');
  DOM.storiesView.classList.add('hidden');
  if (!isPipActive) {
    DOM.inCallView.classList.add('hidden');
  }

  if (tab === 'meetings') {
    DOM.dashboardView.classList.remove('hidden');
    if (DOM.navMeetingsPill) DOM.navMeetingsPill.className = 'w-11 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-google-blue dark:text-blue-400 font-semibold transition-all';
    if (DOM.navMeetingsBtn) DOM.navMeetingsBtn.classList.add('nav-tab-active');
  } else if (tab === 'calls') {
    DOM.callsView.classList.remove('hidden');
    if (DOM.navCallsPill) DOM.navCallsPill.className = 'w-11 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-google-green dark:text-emerald-400 font-semibold transition-all';
    if (DOM.navCallsBtn) DOM.navCallsBtn.classList.add('nav-tab-active');
    renderContacts();
  } else if (tab === 'stories') {
    DOM.storiesView.classList.remove('hidden');
    if (DOM.navStoriesPill) DOM.navStoriesPill.className = 'w-11 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 font-semibold transition-all';
    if (DOM.navStoriesBtn) DOM.navStoriesBtn.classList.add('nav-tab-active');
    renderStoriesGrid();
  }

  lucide.createIcons();
}

// ================= LEFT DRAWER =================
function openSideDrawer() {
  DOM.sideDrawerMenu.classList.remove('-translate-x-full');
  DOM.sideDrawerOverlay.classList.remove('hidden');
  playSound('pop');
}

function closeSideDrawer() {
  DOM.sideDrawerMenu.classList.add('-translate-x-full');
  DOM.sideDrawerOverlay.classList.add('hidden');
}

DOM.sidebarMenuToggle.onclick = openSideDrawer;
DOM.closeSideDrawerBtn.onclick = closeSideDrawer;
DOM.sideDrawerOverlay.onclick = closeSideDrawer;

// ================= PROFILE POPOVER =================
function toggleUserProfilePopover(e) {
  if (e) e.stopPropagation();
  if (DOM.userProfilePopover) {
    DOM.userProfilePopover.classList.toggle('hidden');
    playSound('click');
  }
}

function saveAndCloseProfile() {
  if (DOM.popoverNameInput) {
    const val = DOM.popoverNameInput.value.trim() || 'You';
    state.user.name = val;
    localStorage.setItem('nova_user_name', val);
    if (DOM.selfSpeakerNameLabel) DOM.selfSpeakerNameLabel.textContent = val;
  }
  if (DOM.userProfilePopover) DOM.userProfilePopover.classList.add('hidden');
  playSound('click');
}

DOM.userProfileBtn.onclick = toggleUserProfilePopover;

document.addEventListener('click', (e) => {
  if (DOM.userProfilePopover && !DOM.userProfilePopover.contains(e.target) && !DOM.userProfileBtn.contains(e.target)) {
    DOM.userProfilePopover.classList.add('hidden');
  }
});

DOM.popoverNameInput.onchange = (e) => {
  const val = e.target.value.trim() || 'You';
  state.user.name = val;
  localStorage.setItem('nova_user_name', val);
  if (DOM.selfSpeakerNameLabel) DOM.selfSpeakerNameLabel.textContent = val;
};

document.querySelectorAll('.status-option-btn').forEach(btn => {
  btn.onclick = () => {
    const status = btn.dataset.status;
    state.user.status = status;
    localStorage.setItem('nova_user_status', status);

    if (status === 'available') DOM.headerStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-dark-surface absolute bottom-0 right-0';
    else if (status === 'huddle') DOM.headerStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-dark-surface absolute bottom-0 right-0';
    else if (status === 'busy') DOM.headerStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-dark-surface absolute bottom-0 right-0';
    else if (status === 'away') DOM.headerStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-white dark:ring-dark-surface absolute bottom-0 right-0';

    document.querySelectorAll('.status-option-btn').forEach(b => {
      b.className = 'status-option-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-google-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-white/5 text-google-heading dark:text-white';
    });
    btn.className = 'status-option-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-google-blue/30 bg-blue-50/50 dark:bg-blue-900/20 text-google-blue dark:text-blue-400';
    playSound('pop');
  };
});

DOM.saveProfileBtn.onclick = saveAndCloseProfile;

// ================= PWA INSTALLATION =================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredInstallPrompt = e;
  DOM.installPwaBtn.classList.remove('hidden');
});

DOM.installPwaBtn.onclick = () => {
  openInstallHubModal();
};

// ================= SCREEN ANNOTATION =================
function initAnnotationCanvas() {
  const canvas = DOM.annotationCanvas;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || 800;
  canvas.height = rect.height || 450;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = state.annotation.color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function startDraw(e) {
    if (state.annotation.tool !== 'pen') return;
    state.annotation.isDrawing = true;
    const pos = getCanvasPos(e);
    state.annotation.lastX = pos.x;
    state.annotation.lastY = pos.y;
  }

  function draw(e) {
    const pos = getCanvasPos(e);

    if (state.annotation.tool === 'laser') {
      DOM.laserPointerDot.style.left = `${pos.clientX}px`;
      DOM.laserPointerDot.style.top = `${pos.clientY}px`;
      broadcastRealtimeEvent('ANNOTATION_LASER', { clientX: pos.clientX, clientY: pos.clientY });
      return;
    }

    if (!state.annotation.isDrawing || state.annotation.tool !== 'pen') return;

    ctx.strokeStyle = state.annotation.color;
    ctx.beginPath();
    ctx.moveTo(state.annotation.lastX, state.annotation.lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    broadcastRealtimeEvent('ANNOTATION_DRAW', {
      fromX: state.annotation.lastX,
      fromY: state.annotation.lastY,
      toX: pos.x,
      toY: pos.y,
      color: state.annotation.color
    });

    state.annotation.lastX = pos.x;
    state.annotation.lastY = pos.y;
  }

  function stopDraw() {
    state.annotation.isDrawing = false;
  }

  function getCanvasPos(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top) * (canvas.height / r.height),
      clientX: clientX,
      clientY: clientY
    };
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw);
  canvas.addEventListener('touchmove', draw);
  canvas.addEventListener('touchend', stopDraw);
}

function setAnnotationTool(tool) {
  state.annotation.tool = tool;
  if (!DOM.annotationCanvas) return;
  DOM.annotationCanvas.style.pointerEvents = 'auto';

  if (tool === 'pen') {
    if (DOM.laserPointerDot) DOM.laserPointerDot.classList.add('hidden');
    if (DOM.toolPenBtn) DOM.toolPenBtn.className = 'p-2 rounded-xl bg-white/30 text-white transition-all shadow-md';
    if (DOM.toolLaserBtn) DOM.toolLaserBtn.className = 'p-2 rounded-xl hover:bg-white/20 text-red-400 transition-all';
  } else if (tool === 'laser') {
    if (DOM.laserPointerDot) DOM.laserPointerDot.classList.remove('hidden');
    if (DOM.toolLaserBtn) DOM.toolLaserBtn.className = 'p-2 rounded-xl bg-red-600/40 text-red-400 transition-all shadow-md';
    if (DOM.toolPenBtn) DOM.toolPenBtn.className = 'p-2 rounded-xl hover:bg-white/20 text-white transition-all';
  }
  playSound('click');
}

function clearAnnotations() {
  clearAnnotationCanvasOnly();
  broadcastRealtimeEvent('ANNOTATION_CLEAR', {});
  playSound('pop');
}

function setAnnotationColor(color) {
  state.annotation.color = color;
  document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('ring-2', 'ring-white'));
  const activeDot = document.querySelector(`.color-dot[data-color="${color}"]`);
  if (activeDot) activeDot.classList.add('ring-2', 'ring-white');
  playSound('click');
}

DOM.toolPenBtn.onclick = () => setAnnotationTool('pen');
DOM.toolLaserBtn.onclick = () => setAnnotationTool('laser');
DOM.clearAnnotationBtn.onclick = clearAnnotations;

document.querySelectorAll('.color-dot').forEach(btn => {
  btn.onclick = () => setAnnotationColor(btn.dataset.color);
});

// ================= REAL-TIME BUS & CROSS-DEVICE SYNC =================
function setupRealtimeBus(roomId) {
  if (state.realtimeChannel) {
    try { state.realtimeChannel.close(); } catch (e) {}
    state.realtimeChannel = null;
  }
  if (state.sseSource) {
    try { state.sseSource.close(); } catch (e) {}
    state.sseSource = null;
  }

  // 1. BroadcastChannel (Works instantly across any tabs/windows on the machine)
  try {
    state.realtimeChannel = new BroadcastChannel('nova_room_' + roomId);
    state.realtimeChannel.onmessage = (e) => {
      if (e.data) handleRealtimeEvent(e.data);
    };
  } catch (err) {
    console.warn("BroadcastChannel not supported:", err);
  }

  // 2. LocalStorage StorageEvent fallback
  const storageHandler = (e) => {
    if (e.key === 'nova_sync_' + roomId && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        handleRealtimeEvent(payload);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', storageHandler);

  // 3. Server-Sent Events (SSE) when running node server.js on LAN/WiFi
  if (window.location.protocol.startsWith('http')) {
    try {
      state.sseSource = new EventSource(`/api/events?room=${encodeURIComponent(roomId)}`);
      state.sseSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          handleRealtimeEvent(payload);
        } catch (err) {}
      };
    } catch (err) {
      console.log("SSE not available on this origin:", err);
    }
  }

  // Announce self join to all other peers in the room
  broadcastRealtimeEvent('PEER_JOIN', {
    user: {
      id: state.user.id,
      name: state.user.name,
      initials: state.user.initials || 'ME',
      avatar: state.user.avatar,
      isMuted: state.user.isMuted,
      isHost: true
    }
  });
}

function broadcastRealtimeEvent(type, payload = {}) {
  const message = {
    type,
    senderId: state.user.id,
    senderName: state.user.name,
    roomId: state.activeRoom,
    timestamp: Date.now(),
    ...payload
  };

  // 1. BroadcastChannel
  if (state.realtimeChannel) {
    try { state.realtimeChannel.postMessage(message); } catch (e) {}
  }

  // 2. LocalStorage
  try {
    localStorage.setItem('nova_sync_' + state.activeRoom, JSON.stringify({
      ...message,
      _rand: Math.random()
    }));
  } catch (e) {}

  // 3. Server HTTP POST broadcast (For LAN/WiFi testing)
  if (window.location.protocol.startsWith('http') && state.activeRoom) {
    fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: state.activeRoom,
        data: message
      })
    }).catch(() => {});
  }
}

function handleRealtimeEvent(msg) {
  if (!msg || !msg.type || msg.senderId === state.user.id) return;

  switch (msg.type) {
    case 'PEER_JOIN': {
      const peer = msg.user;
      if (!peer || !peer.id) return;

      const exists = state.participants.find(p => p.id === peer.id);
      if (!exists) {
        state.participants.push({
          id: peer.id,
          name: peer.name || 'Team Peer',
          initials: peer.initials || 'P',
          avatar: peer.avatar || null,
          color: 'from-emerald-500 to-teal-600',
          isHost: false,
          isMuted: !!peer.isMuted,
          isSpeaking: false
        });
        playSound('join');
        renderSpeakerTiles();
        renderPeopleList();

        // Respond with PEER_ACK so new peer knows about us!
        broadcastRealtimeEvent('PEER_ACK', {
          user: {
            id: state.user.id,
            name: state.user.name,
            initials: state.user.initials || 'ME',
            avatar: state.user.avatar,
            isMuted: state.user.isMuted,
            isHost: true
          }
        });
      }
      break;
    }

    case 'PEER_ACK': {
      const peer = msg.user;
      if (!peer || !peer.id) return;
      const exists = state.participants.find(p => p.id === peer.id);
      if (!exists) {
        state.participants.push({
          id: peer.id,
          name: peer.name,
          initials: peer.initials || 'P',
          avatar: peer.avatar || null,
          color: 'from-blue-600 to-indigo-600',
          isHost: !!peer.isHost,
          isMuted: !!peer.isMuted,
          isSpeaking: false
        });
        renderSpeakerTiles();
        renderPeopleList();
      }
      break;
    }

    case 'PEER_LEAVE': {
      const leavingId = msg.userId || msg.senderId;
      state.participants = state.participants.filter(p => p.id !== leavingId);
      playSound('leave');
      renderSpeakerTiles();
      renderPeopleList();
      break;
    }

    case 'KICK_PARTICIPANT': {
      if (msg.targetUserId === state.user.id) {
        leaveCall();
        if (DOM.kickedAlertModal) DOM.kickedAlertModal.classList.remove('hidden');
        playSound('leave');
      } else {
        state.participants = state.participants.filter(p => p.id !== msg.targetUserId);
        renderSpeakerTiles();
        renderPeopleList();
        appendSystemChatMessage(`🚪 ${msg.targetUserName || 'Participant'} was removed by ${msg.kickedBy || 'Host'}`);
        playSound('leave');
      }
      break;
    }

    case 'HOST_MUTE': {
      if (msg.targetUserId === state.user.id) {
        if (!state.user.isMuted) toggleMic();
        alert("🔇 The host has muted your microphone.");
      } else {
        const p = state.participants.find(x => x.id === msg.targetUserId);
        if (p) p.isMuted = true;
        renderSpeakerTiles();
        renderPeopleList();
      }
      break;
    }

    case 'PEER_MUTE': {
      const p = state.participants.find(x => x.id === msg.userId);
      if (p) {
        p.isMuted = !!msg.isMuted;
        renderSpeakerTiles();
        renderPeopleList();
      }
      break;
    }

    case 'PEER_SPEAKING': {
      const p = state.participants.find(x => x.id === msg.userId);
      if (p) {
        p.isSpeaking = !!msg.speaking;
        updateParticipantSpeakingVisual(p.id, p.isSpeaking);
      }
      break;
    }

    case 'CHAT_MESSAGE': {
      renderIncomingChatMessage(msg.sender, msg.text, msg.fileUrl, msg.time);
      break;
    }

    case 'REACTION': {
      if (msg.emoji) {
        spawnFlyingEmoji(msg.emoji);
        playSound('pop');
      }
      break;
    }

    case 'SOUNDBOARD': {
      if (msg.sfx) {
        playCustomSoundboard(msg.sfx);
      }
      break;
    }

    case 'ANNOTATION_DRAW': {
      drawRemoteAnnotation(msg);
      break;
    }

    case 'ANNOTATION_LASER': {
      if (DOM.laserPointerDot) {
        DOM.laserPointerDot.style.left = `${msg.clientX}px`;
        DOM.laserPointerDot.style.top = `${msg.clientY}px`;
        DOM.laserPointerDot.classList.remove('hidden');
      }
      break;
    }

    case 'ANNOTATION_CLEAR': {
      clearAnnotationCanvasOnly();
      break;
    }
  }
}

// ================= PARTICIPANT MANAGEMENT (KICK & MUTE) =================
function initRoomParticipants() {
  state.participants = [
    {
      id: state.user.id,
      name: state.user.name.replace(/\s*\(Host\)/g, '').trim() || 'You',
      initials: 'ME',
      avatar: state.user.avatar,
      color: 'from-blue-600 to-indigo-600',
      isHost: true,
      isMuted: state.user.isMuted,
      isSpeaking: false
    },
    {
      id: 'p_rafid',
      name: 'Rafid Karim',
      initials: 'RK',
      avatar: null,
      color: 'from-amber-500 to-orange-600',
      isHost: false,
      isMuted: false,
      isSpeaking: false
    }
  ];
  renderSpeakerTiles();
  renderPeopleList();
}

function renderSpeakerTiles() {
  if (!DOM.speakerTilesGrid) return;
  DOM.speakerTilesGrid.innerHTML = '';

  state.participants.forEach(p => {
    const isSelf = p.id === state.user.id;
    const cleanName = (p.name || '').replace(/\s*\(Host\)/g, '').trim() || (isSelf ? 'You' : 'Participant');
    const displayName = isSelf ? `${cleanName} (Host)` : cleanName;

    const tile = document.createElement('div');
    tile.id = isSelf ? 'selfSpeakerCard' : `speaker_tile_${p.id}`;
    tile.className = `participant-tile bg-google-callCard rounded-2xl flex flex-col items-center justify-center relative p-6 min-h-[220px] transition-all overflow-hidden ${p.isSpeaking ? 'speaking-active-ring' : ''}`;

    let avatarHtml = '';
    if (isSelf && state.user.avatar) {
      avatarHtml = `<img id="selfSpeakerAvatarImg" src="${state.user.avatar}" class="w-full h-full object-cover">`;
    } else if (p.avatar) {
      avatarHtml = `<img src="${p.avatar}" class="w-full h-full object-cover">`;
    } else {
      avatarHtml = `<span id="${isSelf ? 'selfSpeakerInitials' : ''}">${p.initials || 'U'}</span>`;
    }

    let actionToolbarHtml = '';
    if (!isSelf) {
      actionToolbarHtml = `
        <div class="tile-actions absolute top-3 right-3 flex items-center gap-1.5 z-30">
          <button onclick="toggleMuteParticipant('${p.id}')" class="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white hover:text-amber-300 transition-all shadow-md" title="${p.isMuted ? 'Unmute' : 'Mute'} participant">
            <i data-lucide="${p.isMuted ? 'mic-off' : 'mic'}" class="w-3.5 h-3.5 ${p.isMuted ? 'text-red-400' : 'text-slate-200'}"></i>
          </button>
          <button onclick="confirmKickParticipant('${p.id}', '${cleanName.replace(/'/g, "\\'")}')" class="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-red-600/85 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95" title="Kick ${cleanName} from huddle">
            <i data-lucide="user-x" class="w-3.5 h-3.5"></i>
            <span class="text-[11px] hidden sm:inline">Kick</span>
          </button>
        </div>
      `;
    }

    tile.innerHTML = `
      ${actionToolbarHtml}

      <div class="relative flex items-center justify-center">
        <div id="${isSelf ? 'selfRipple1' : `ripple1_${p.id}`}" class="absolute w-28 h-28 rounded-full border border-blue-400/40 speaking-ripple-1 opacity-0 pointer-events-none ${p.isSpeaking ? '!opacity-80' : ''}"></div>
        <div id="${isSelf ? 'selfRipple2' : `ripple2_${p.id}`}" class="absolute w-28 h-28 rounded-full border border-cyan-400/40 speaking-ripple-2 opacity-0 pointer-events-none ${p.isSpeaking ? '!opacity-60' : ''}"></div>

        <div id="${isSelf ? 'selfSpeakerAvatar' : ''}" class="w-24 h-24 rounded-full bg-gradient-to-tr ${p.color || 'from-blue-600 to-indigo-600'} flex items-center justify-center text-3xl font-bold text-white shadow-xl relative z-10 overflow-hidden">
          ${avatarHtml}
        </div>
      </div>

      <div class="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm text-xs text-white z-20">
        <span id="${isSelf ? 'selfMicIcon' : ''}" class="${p.isMuted ? 'text-red-400' : 'text-white'}">
          <i data-lucide="${p.isMuted ? 'mic-off' : 'mic'}" class="w-3.5 h-3.5"></i>
        </span>
        <span id="${isSelf ? 'selfSpeakerNameLabel' : ''}" class="font-medium">${displayName}</span>
      </div>
    `;

    DOM.speakerTilesGrid.appendChild(tile);
  });

  // Always append the "Add others" card
  const addTile = document.createElement('div');
  addTile.onclick = openInviteModal;
  addTile.className = 'border-2 border-dashed border-white/20 hover:border-google-blue/60 rounded-2xl flex flex-col items-center justify-center gap-2 p-6 min-h-[220px] cursor-pointer group transition-all';
  addTile.innerHTML = `
    <div class="w-14 h-14 rounded-full bg-white/10 group-hover:bg-blue-600/30 flex items-center justify-center text-slate-300 group-hover:text-white transition-all">
      <i data-lucide="user-plus" class="w-6 h-6"></i>
    </div>
    <span class="text-xs font-semibold text-slate-300 group-hover:text-white">Add others</span>
  `;
  DOM.speakerTilesGrid.appendChild(addTile);

  lucide.createIcons();
}

function renderPeopleList() {
  const count = state.participants.length;
  if (DOM.peopleCountBadge) DOM.peopleCountBadge.textContent = count;
  if (DOM.sidePanelPeopleCount) DOM.sidePanelPeopleCount.textContent = count;
  if (!DOM.peopleListContainer) return;

  DOM.peopleListContainer.innerHTML = '';

  state.participants.forEach(p => {
    const isSelf = p.id === state.user.id;
    const item = document.createElement('div');
    item.className = 'p-2.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-google-border dark:border-dark-border flex items-center justify-between gap-2 shadow-sm';

    let avatarHtml = '';
    if (isSelf && state.user.avatar) {
      avatarHtml = `<img src="${state.user.avatar}" class="w-full h-full object-cover">`;
    } else if (p.avatar) {
      avatarHtml = `<img src="${p.avatar}" class="w-full h-full object-cover">`;
    } else {
      avatarHtml = `<span>${p.initials || 'U'}</span>`;
    }

    item.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${p.color || 'from-blue-600 to-indigo-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
          ${avatarHtml}
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h5 class="text-xs font-bold text-google-heading dark:text-white truncate">${p.name}</h5>
            ${isSelf ? '<span class="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-google-blue dark:text-blue-300 font-bold px-1.5 py-0.2 rounded">Host</span>' : ''}
          </div>
          <span class="text-[10px] text-google-subtext dark:text-dark-subtext flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full ${p.isMuted ? 'bg-red-500' : 'bg-emerald-500'}"></span>
            <span>${p.isMuted ? 'Muted' : 'Speaking Active'}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        ${!isSelf ? `
          <button onclick="toggleMuteParticipant('${p.id}')" class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 ${p.isMuted ? 'text-red-500' : 'text-google-subtext dark:text-dark-subtext'}" title="${p.isMuted ? 'Unmute' : 'Mute'} participant">
            <i data-lucide="${p.isMuted ? 'mic-off' : 'mic'}" class="w-4 h-4"></i>
          </button>
          <button onclick="confirmKickParticipant('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" title="Kick participant">
            <i data-lucide="user-x" class="w-4 h-4"></i>
          </button>
        ` : `
          <span class="text-[10px] text-google-subtext pr-1.5 font-medium">You</span>
        `}
      </div>
    `;

    DOM.peopleListContainer.appendChild(item);
  });

  lucide.createIcons();
}

function confirmKickParticipant(id, name) {
  state.pendingKickUserId = id;
  if (DOM.kickTargetUserName) DOM.kickTargetUserName.textContent = name;
  if (DOM.kickConfirmModal) DOM.kickConfirmModal.classList.remove('hidden');
}

function closeKickModal() {
  state.pendingKickUserId = null;
  if (DOM.kickConfirmModal) DOM.kickConfirmModal.classList.add('hidden');
}

function executeKickConfirmed() {
  if (state.pendingKickUserId) {
    kickParticipant(state.pendingKickUserId);
  }
  closeKickModal();
}

if (DOM.confirmKickBtn) {
  DOM.confirmKickBtn.onclick = executeKickConfirmed;
}

function kickParticipant(id) {
  const p = state.participants.find(x => x.id === id);
  const name = p ? p.name : 'Participant';

  // Remove from participants
  state.participants = state.participants.filter(x => x.id !== id);

  // Broadcast to other peers
  broadcastRealtimeEvent('KICK_PARTICIPANT', {
    targetUserId: id,
    targetUserName: name,
    kickedBy: state.user.name
  });

  // Play chime & re-render
  playSound('leave');
  renderSpeakerTiles();
  renderPeopleList();

  // Add system notice in live chat
  appendSystemChatMessage(`🚪 ${name} was removed from the call by the host.`);
}

function toggleMuteParticipant(id) {
  const p = state.participants.find(x => x.id === id);
  if (!p) return;
  p.isMuted = !p.isMuted;

  broadcastRealtimeEvent('HOST_MUTE', {
    targetUserId: id,
    isMuted: p.isMuted
  });

  renderSpeakerTiles();
  renderPeopleList();
  playSound('click');
}

function muteAllParticipants() {
  state.participants.forEach(p => {
    if (p.id !== state.user.id) {
      p.isMuted = true;
      broadcastRealtimeEvent('HOST_MUTE', {
        targetUserId: p.id,
        isMuted: true
      });
    }
  });

  renderSpeakerTiles();
  renderPeopleList();
  playSound('click');
  appendSystemChatMessage(`🔇 The host muted all participants.`);
}

function openInviteModal() {
  if (DOM.inviteLinkInput) {
    DOM.inviteLinkInput.value = window.location.href;
  }

  // Populate teammates quick add list
  if (DOM.quickAddTeammatesList) {
    DOM.quickAddTeammatesList.innerHTML = '';
    state.contacts.forEach(contact => {
      const inRoom = state.participants.some(p => p.name === contact.name || p.id === contact.id);

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-dark-card border border-google-border dark:border-dark-border';
      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${contact.color} text-white font-bold text-xs flex items-center justify-center">
            ${contact.initials}
          </div>
          <div>
            <h5 class="text-xs font-bold text-google-heading dark:text-white">${contact.name}</h5>
            <span class="text-[10px] text-google-subtext">${contact.handle}</span>
          </div>
        </div>

        <button onclick="addTeammateToCall('${contact.id}')" ${inRoom ? 'disabled' : ''} class="px-3 py-1 rounded-lg text-xs font-semibold ${inRoom ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed' : 'bg-google-green text-white hover:bg-google-hoverGreen'} transition-all">
          ${inRoom ? 'In Call' : '+ Add'}
        </button>
      `;
      DOM.quickAddTeammatesList.appendChild(row);
    });
  }

  if (DOM.inviteTeammatesModal) DOM.inviteTeammatesModal.classList.remove('hidden');
  lucide.createIcons();
}

function closeInviteModal() {
  if (DOM.inviteTeammatesModal) DOM.inviteTeammatesModal.classList.add('hidden');
}

function copyInviteLinkModal() {
  const link = (DOM.inviteLinkInput && DOM.inviteLinkInput.value) || window.location.href;
  navigator.clipboard.writeText(link).then(() => {
    alert("📋 Meeting link copied to clipboard!");
  }).catch(() => {
    prompt("Copy link:", link);
  });
}

if (DOM.copyInviteLinkModalBtn) {
  DOM.copyInviteLinkModalBtn.onclick = copyInviteLinkModal;
}

function addTeammateToCall(contactId) {
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) return;

  const exists = state.participants.find(p => p.name === contact.name || p.id === contact.id);
  if (exists) return;

  state.participants.push({
    id: contact.id,
    name: contact.name,
    initials: contact.initials,
    avatar: null,
    color: contact.color,
    isHost: false,
    isMuted: false,
    isSpeaking: false
  });

  playSound('join');
  renderSpeakerTiles();
  renderPeopleList();
  closeInviteModal();

  appendSystemChatMessage(`🎉 ${contact.name} joined the huddle!`);

  setTimeout(() => {
    renderIncomingChatMessage({ name: contact.name, initials: contact.initials }, "Hey everyone! Glad to join.", null, new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  }, 1200);
}

function updateParticipantSpeakingVisual(userId, speaking) {
  const isSelf = userId === state.user.id;
  const ripple1 = isSelf ? DOM.selfRipple1 : document.getElementById(`ripple1_${userId}`);
  const ripple2 = isSelf ? DOM.selfRipple2 : document.getElementById(`ripple2_${userId}`);
  const card = isSelf ? DOM.selfSpeakerCard : document.getElementById(`speaker_tile_${userId}`);

  if (speaking) {
    if (ripple1) ripple1.classList.add('!opacity-80');
    if (ripple2) ripple2.classList.add('!opacity-60');
    if (card) card.classList.add('speaking-active-ring');
  } else {
    if (ripple1) ripple1.classList.remove('!opacity-80');
    if (ripple2) ripple2.classList.remove('!opacity-60');
    if (card) card.classList.remove('speaking-active-ring');
  }
}

function drawRemoteAnnotation(msg) {
  const canvas = DOM.annotationCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = msg.color || '#ef4444';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(msg.fromX, msg.fromY);
  ctx.lineTo(msg.toX, msg.toY);
  ctx.stroke();
}

function clearAnnotationCanvasOnly() {
  const canvas = DOM.annotationCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ================= IN-CALL SIDE PANEL (PEOPLE + SCRATCHPAD + CHAT) =================
function switchSidePanelTab(tab) {
  // Reset all tabs
  [DOM.tabPeopleBtn, DOM.tabNotesBtn, DOM.tabChatBtn].forEach(btn => {
    if (btn) btn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg text-google-subtext dark:text-dark-subtext hover:text-google-heading dark:hover:text-white flex items-center justify-center gap-1 transition-all';
  });

  if (DOM.sidePanelPeopleContent) DOM.sidePanelPeopleContent.classList.add('hidden');
  if (DOM.sidePanelNotesContent) DOM.sidePanelNotesContent.classList.add('hidden');
  if (DOM.sidePanelChatContent) DOM.sidePanelChatContent.classList.add('hidden');

  if (tab === 'people') {
    if (DOM.tabPeopleBtn) DOM.tabPeopleBtn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-dark-surface shadow-sm text-google-blue dark:text-blue-400 flex items-center justify-center gap-1';
    if (DOM.sidePanelPeopleContent) DOM.sidePanelPeopleContent.classList.remove('hidden');
    renderPeopleList();
  } else if (tab === 'notes') {
    if (DOM.tabNotesBtn) DOM.tabNotesBtn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-dark-surface shadow-sm text-google-blue dark:text-blue-400 flex items-center justify-center gap-1';
    if (DOM.sidePanelNotesContent) DOM.sidePanelNotesContent.classList.remove('hidden');
  } else if (tab === 'chat') {
    if (DOM.tabChatBtn) DOM.tabChatBtn.className = 'flex-1 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-dark-surface shadow-sm text-google-blue dark:text-blue-400 flex items-center justify-center gap-1 relative';
    if (DOM.sidePanelChatContent) DOM.sidePanelChatContent.classList.remove('hidden');
    if (DOM.chatUnreadDot) DOM.chatUnreadDot.classList.add('hidden');
  }

  playSound('click');
  lucide.createIcons();
}

function sendChatMessage(text, fileUrl = null, fileName = null) {
  if (!text && !fileUrl) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex flex-col gap-0.5 self-end max-w-[85%]';

  let fileContentHtml = '';
  if (fileUrl) {
    fileContentHtml = `<div class="mb-1"><img src="${fileUrl}" class="rounded-lg max-h-36 object-cover border border-white/20"></div>`;
  }

  msgDiv.innerHTML = `
    <div class="flex items-center gap-1 text-[10px] text-google-subtext dark:text-dark-subtext justify-end">
      <span>${timeStr}</span> • <span class="font-bold text-google-blue dark:text-blue-400">${state.user.name}</span>
    </div>
    <div class="p-2.5 rounded-xl bg-google-blue text-white leading-relaxed break-words shadow-sm">
      ${fileContentHtml}
      ${text ? `<span>${text}</span>` : ''}
    </div>
  `;

  DOM.chatMessagesContainer.appendChild(msgDiv);
  DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
  playSound('pop');

  // Broadcast real-time message to peers
  broadcastRealtimeEvent('CHAT_MESSAGE', {
    sender: {
      name: state.user.name,
      initials: state.user.initials || 'ME',
      avatar: state.user.avatar
    },
    text,
    fileUrl,
    time: timeStr
  });

  // If simulated teammates are in the call and no real peer replied, simulate interactive responses
  if (state.participants.some(p => p.id === 'p_rafid')) {
    setTimeout(() => {
      simulateTeammateChatResponse(text);
    }, 1500);
  }
}

function renderIncomingChatMessage(sender, text, fileUrl, time) {
  if (!DOM.chatMessagesContainer) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex flex-col gap-0.5 self-start max-w-[85%] animate-in fade-in';

  let fileContentHtml = '';
  if (fileUrl) {
    fileContentHtml = `<div class="mb-1"><img src="${fileUrl}" class="rounded-lg max-h-36 object-cover border border-white/20"></div>`;
  }

  msgDiv.innerHTML = `
    <div class="flex items-center gap-1 text-[10px] text-google-subtext dark:text-dark-subtext">
      <span class="font-bold text-google-heading dark:text-white">${sender.name || 'Participant'}</span> • <span>${time || 'Now'}</span>
    </div>
    <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-google-heading dark:text-white leading-relaxed break-words shadow-sm">
      ${fileContentHtml}
      ${text ? `<span>${text}</span>` : ''}
    </div>
  `;

  DOM.chatMessagesContainer.appendChild(msgDiv);
  DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
  playSound('pop');

  if (DOM.sidePanelChatContent && DOM.sidePanelChatContent.classList.contains('hidden') && DOM.chatUnreadDot) {
    DOM.chatUnreadDot.classList.remove('hidden');
  }
}

function appendSystemChatMessage(text) {
  if (!DOM.chatMessagesContainer) return;
  const div = document.createElement('div');
  div.className = 'py-1 px-3 my-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-google-border dark:border-dark-border text-[11px] text-center text-google-subtext dark:text-dark-subtext self-center';
  div.textContent = text;
  DOM.chatMessagesContainer.appendChild(div);
  DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
}

function simulateTeammateChatResponse(incomingText) {
  const responses = [
    "Sounding loud and clear on my end! 👍",
    "Got it, looking at the shared screen right now.",
    "Makes sense, let's keep that in the action items.",
    "Nice! The audio quality is super smooth today 🚀",
    "Agreed! I'll note that down."
  ];
  const reply = responses[Math.floor(Math.random() * responses.length)];
  const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  renderIncomingChatMessage({ name: 'Rafid Karim', initials: 'RK' }, reply, null, timeStr);
}

function handleSendChatMessage() {
  if (!DOM.chatTextInput) return;
  const text = DOM.chatTextInput.value.trim();
  if (text) {
    sendChatMessage(text);
    DOM.chatTextInput.value = '';
  }
}

DOM.sendChatBtn.onclick = handleSendChatMessage;

DOM.chatTextInput.onkeydown = (e) => {
  if (e.key === 'Enter') {
    DOM.sendChatBtn.click();
  }
};

DOM.chatFileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      sendChatMessage(`Shared file: ${file.name}`, event.target.result, file.name);
    };
    reader.readAsDataURL(file);
  }
};

// ================= AI SUMMARY =================
DOM.generateAiSummaryBtn.onclick = generateAiMeetingSummary;

function generateAiMeetingSummary() {
  const duration = DOM.callDuration.textContent || '05:30';

  DOM.aiSummaryContent.innerHTML = `
    <div class="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
      <h5 class="font-bold text-xs text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
        <span>Executive Summary</span>
      </h5>
      <p class="text-xs leading-relaxed text-google-heading dark:text-white">
        The team held an audio huddle for <strong>${duration}</strong>. Key highlights included live canvas annotations, real-time screen sharing, and user profile persistence.
      </p>
    </div>

    <div class="flex flex-col gap-1.5">
      <h5 class="font-bold text-xs uppercase tracking-wider text-google-subtext dark:text-dark-subtext">Key Decisions</h5>
      <ul class="list-disc pl-4 space-y-1">
        <li>Approved Live Annotation feature on top of shared screen canvas.</li>
        <li>Enabled custom photo upload with permanent LocalStorage persistence.</li>
        <li>Activated host room-lock and knocking permission flow.</li>
      </ul>
    </div>

    <div class="flex flex-col gap-1.5">
      <h5 class="font-bold text-xs uppercase tracking-wider text-google-subtext dark:text-dark-subtext">Action Items</h5>
      <div class="space-y-1.5">
        <label class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-dark-card border border-google-border dark:border-dark-border cursor-pointer">
          <input type="checkbox" checked class="accent-google-green w-4 h-4 rounded">
          <span>Enable permanent profile picture upload from ME popover (Done)</span>
        </label>
        <label class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-dark-card border border-google-border dark:border-dark-border cursor-pointer">
          <input type="checkbox" class="accent-google-green w-4 h-4 rounded">
          <span>Test multi-device audio streaming across local network</span>
        </label>
      </div>
    </div>
  `;

  DOM.aiSummaryModal.classList.remove('hidden');
  playSound('pop');
  lucide.createIcons();
}

function closeAiSummaryModal() {
  if (DOM.aiSummaryModal) DOM.aiSummaryModal.classList.add('hidden');
}

function copyAiSummary() {
  const duration = (DOM.callDuration && DOM.callDuration.textContent) || '05:00';
  const plainText = `# Nova Meet - AI Summary\nRoom: ${state.activeRoom || 'nova-call'}\nDuration: ${duration}\n\n## Executive Summary\nTeam huddle discussing real-time collaboration and profile customizations.`;
  navigator.clipboard.writeText(plainText).then(() => {
    alert("📋 AI Meeting Summary copied to clipboard!");
  });
}

function exportAiSummary() {
  const duration = (DOM.callDuration && DOM.callDuration.textContent) || '05:00';
  const plainText = `# Nova Meet - AI Summary\nRoom: ${state.activeRoom || 'nova-call'}\nDuration: ${duration}\n\n## Executive Summary\nTeam huddle discussing real-time collaboration.`;
  const blob = new Blob([plainText], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ai-summary-${state.activeRoom || 'nova'}.md`;
  a.click();
}

DOM.closeAiSummaryBtn.onclick = closeAiSummaryModal;
DOM.copyAiSummaryBtn.onclick = copyAiSummary;
DOM.exportAiSummaryBtn.onclick = exportAiSummary;

// ================= SOUNDBOARD =================
DOM.dockSoundboardBtn.onclick = toggleSoundboard;

document.querySelectorAll('.soundboard-btn').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const sfx = btn.dataset.sfx;
    playCustomSoundboard(sfx);
    broadcastRealtimeEvent('SOUNDBOARD', { sfx });
    DOM.soundboardMenu.classList.add('hidden');
  };
});

function playCustomSoundboard(sfx) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    if (sfx === 'airhorn') {
      [0, 0.12, 0.24, 0.36].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(466.16, now + delay);
        gain.gain.setValueAtTime(0.15, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
        osc.start(now + delay);
        osc.stop(now + delay + 0.1);
      });
      spawnFlyingEmoji('📢');
    } else if (sfx === 'applause') {
      for (let i = 0; i < 18; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        const t = now + Math.random() * 0.9;
        osc.frequency.setValueAtTime(800 + Math.random() * 400, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.start(t);
        osc.stop(t + 0.06);
      }
      spawnFlyingEmoji('👏');
    } else if (sfx === 'drumroll') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(140, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(950, now + 0.18);
      gain2.gain.setValueAtTime(0.2, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.45);
      spawnFlyingEmoji('🥁');
    } else if (sfx === 'ding') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      spawnFlyingEmoji('🔔');
    } else if (sfx === 'party') {
      [587.33, 739.99, 880, 1174.66].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);
        gain.gain.setValueAtTime(0.06, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.18);
      });
      spawnFlyingEmoji('🎉');
    } else if (sfx === 'laugh') {
      [400, 500, 420, 520, 450].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.09);
        gain.gain.setValueAtTime(0.12, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.08);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.08);
      });
      spawnFlyingEmoji('😂');
    }
  } catch (err) {}
}

// ================= ROOM LOCK =================
function toggleRoomLock() {
  state.isRoomLocked = !state.isRoomLocked;
  playSound('click');

  if (state.isRoomLocked) {
    if (DOM.roomLockBtn) DOM.roomLockBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/30 border border-amber-500/50 text-xs font-semibold text-amber-300 transition-colors shadow-sm';
    if (DOM.roomLockIcon) DOM.roomLockIcon.setAttribute('data-lucide', 'lock');
    if (DOM.roomLockText) DOM.roomLockText.textContent = 'Locked 🔒';
    lucide.createIcons();

    setTimeout(() => {
      if (state.isRoomLocked && state.activeRoom) {
        if (DOM.knockingUserName) DOM.knockingUserName.textContent = 'Tanvir Hossain is knocking';
        if (DOM.knockingToast) DOM.knockingToast.classList.remove('hidden');
        playSound('join');
      }
    }, 3000);
  } else {
    if (DOM.roomLockBtn) DOM.roomLockBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors';
    if (DOM.roomLockIcon) DOM.roomLockIcon.setAttribute('data-lucide', 'unlock');
    if (DOM.roomLockText) DOM.roomLockText.textContent = 'Unlocked';
    if (DOM.knockingToast) DOM.knockingToast.classList.add('hidden');
    lucide.createIcons();
  }
}

function admitKnock() {
  if (DOM.knockingToast) DOM.knockingToast.classList.add('hidden');
  alert("✅ Tanvir Hossain has been admitted to the huddle!");
  playSound('join');
}

function denyKnock() {
  if (DOM.knockingToast) DOM.knockingToast.classList.add('hidden');
  playSound('leave');
}

DOM.roomLockBtn.onclick = toggleRoomLock;
DOM.admitKnockBtn.onclick = admitKnock;
DOM.denyKnockBtn.onclick = denyKnock;

// ================= CONTACTS & CALLS =================
function renderContacts(filterText = '') {
  DOM.contactsListContainer.innerHTML = '';
  const query = filterText.toLowerCase();

  const filtered = state.contacts.filter(c => c.name.toLowerCase().includes(query) || c.handle.toLowerCase().includes(query));

  filtered.forEach(contact => {
    const row = document.createElement('div');
    row.className = 'p-3.5 rounded-2xl bg-white dark:bg-dark-surface border border-google-border dark:border-dark-border hover:border-google-blue/60 transition-all flex items-center justify-between gap-4 shadow-sm';

    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="w-11 h-11 rounded-full bg-gradient-to-tr ${contact.color} flex items-center justify-center font-bold text-sm text-white shadow-sm">
            ${contact.initials}
          </div>
          <span class="w-3 h-3 rounded-full ${contact.statusColor} border-2 border-white dark:border-dark-surface absolute bottom-0 right-0"></span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-sm text-google-heading dark:text-white leading-tight">${contact.name}</h4>
            <span class="text-[11px] text-google-subtext dark:text-dark-subtext">${contact.handle}</span>
          </div>
          <p class="text-xs text-google-subtext dark:text-dark-subtext mt-0.5 flex items-center gap-1.5">
            ${contact.inCall ? '<span class="text-emerald-500 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> In Huddle</span> •' : ''}
            <span>${contact.note}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="joinCall('${contact.room || 'direct-' + contact.initials.toLowerCase()}')" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-google-green hover:bg-google-hoverGreen text-white text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95" title="Direct Audio Call">
          <i data-lucide="phone" class="w-3.5 h-3.5"></i>
          <span>${contact.inCall ? 'Join Huddle' : 'Call'}</span>
        </button>
        <button onclick="joinCall('${contact.room || 'direct-' + contact.initials.toLowerCase()}'); setTimeout(toggleScreenShare, 600);" class="p-2 rounded-xl border border-google-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-white/5 text-google-subtext dark:text-dark-subtext hover:text-google-heading" title="Call & Screen Share">
          <i data-lucide="monitor" class="w-4 h-4 text-google-blue"></i>
        </button>
      </div>
    `;

    DOM.contactsListContainer.appendChild(row);
  });

  lucide.createIcons();
}

DOM.contactSearchInput.oninput = (e) => {
  renderContacts(e.target.value);
};

// ================= STORIES GRID =================
function renderStoriesGrid() {
  DOM.storiesGridContainer.innerHTML = '';

  state.stories.forEach(story => {
    const card = document.createElement('div');
    card.className = 'story-card rounded-2xl bg-slate-900 border border-google-border dark:border-dark-border h-64 flex flex-col justify-between p-3.5 relative overflow-hidden shadow-md cursor-pointer group select-none';

    const ringClass = story.inHuddle ? 'story-ring-active-call' : 'story-ring-unseen';

    card.innerHTML = `
      <img src="${story.photo}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
      <div class="absolute inset-0 story-scrim-gradient"></div>

      <div class="relative z-10 flex items-center justify-between">
        <div class="w-10 h-10 rounded-full ${ringClass} shadow-md flex items-center justify-center">
          <div class="w-full h-full rounded-full bg-gradient-to-tr ${story.color} flex items-center justify-center font-bold text-xs text-white">
            ${story.initials}
          </div>
        </div>
        ${story.inHuddle ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-sm">In Call</span>' : ''}
      </div>

      <div class="relative z-10 flex flex-col gap-1.5">
        <div class="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-2 text-xs text-white leading-snug font-medium shadow-sm">
          ${story.note}
        </div>
        <div class="flex items-center justify-between text-white drop-shadow">
          <span class="text-xs font-bold truncate">${story.author}</span>
          <span class="text-[10px] text-white/70">${story.timeAgo}</span>
        </div>
      </div>
    `;

    card.onclick = () => openStoryViewer(story);
    DOM.storiesGridContainer.appendChild(card);
  });

  lucide.createIcons();
}

// ================= THEME =================
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('nova_theme', theme);

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.innerHTML = `<i data-lucide="sun" id="themeIcon" class="w-4 h-4 text-amber-400"></i>`;
    }
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.innerHTML = `<i data-lucide="moon" id="themeIcon" class="w-4 h-4 text-google-subtext"></i>`;
    }
  }
  lucide.createIcons();
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  playSound('pop');
}

DOM.themeToggleBtn.onclick = toggleTheme;

// ================= CALENDAR DATE STRIP NAVIGATION =================
let currentCalendarDate = new Date();

function changeCalendarDate(deltaDays) {
  currentCalendarDate.setDate(currentCalendarDate.getDate() + deltaDays);
  updateCalendarHeaderDisplay();
  playSound('click');
}

function selectCalendarDay(el, dayStr) {
  document.querySelectorAll('.calendar-day-chip').forEach(c => {
    c.className = 'calendar-day-chip flex flex-col items-center py-1.5 px-3 rounded-xl hover:bg-white dark:hover:bg-dark-card text-xs cursor-pointer select-none transition-colors';
    const sub = c.querySelector('span:first-child');
    if (sub) sub.className = 'text-[10px] font-semibold text-google-subtext dark:text-dark-subtext';
  });
  if (el) {
    el.className = 'calendar-day-chip flex flex-col items-center py-1.5 px-3.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-google-blue dark:text-blue-400 font-bold text-xs shadow-sm cursor-pointer select-none transition-colors';
    const sub = el.querySelector('span:first-child');
    if (sub) sub.className = 'text-[10px] font-semibold text-blue-700 dark:text-blue-300';
  }
  const heading = document.getElementById('calendarMonthDate');
  if (heading) {
    heading.innerHTML = `<span>${dayStr}</span><i data-lucide="calendar" class="w-4 h-4 text-google-subtext dark:text-dark-subtext"></i>`;
    lucide.createIcons();
  }
  playSound('click');
}

function updateCalendarHeaderDisplay() {
  const heading = document.getElementById('calendarMonthDate');
  if (heading) {
    const dateStr = currentCalendarDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    heading.innerHTML = `<span>${dateStr}</span><i data-lucide="calendar" class="w-4 h-4 text-google-subtext dark:text-dark-subtext"></i>`;
    lucide.createIcons();
  }
}

// ================= CLOCK =================
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  if (DOM.liveClockDisplay) {
    DOM.liveClockDisplay.textContent = `${timeStr} • ${dateStr}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

// ================= SOUND SYNTHESIZER =================
function playSound(type) {
  if (DOM.profileSoundToggle && !DOM.profileSoundToggle.checked) return;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === 'join') {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.3);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } else if (type === 'leave') {
      [783.99, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.08, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.28);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.28);
      });
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(1080, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (err) {}
}

// ================= STORIES CAROUSEL =================
function renderStories() {
  const cards = DOM.storiesCarousel.querySelectorAll('.dynamic-story-card');
  cards.forEach(c => c.remove());

  if (state.user.story) {
    DOM.selfCurrentNotePill.textContent = state.user.story.note || 'Active Story';
    DOM.selfCurrentNotePill.className = 'text-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full truncate max-w-[110px]';
    DOM.popoverNoteDisplay.textContent = state.user.story.note || 'Active Story';

    const selfCard = createStoryCardElement({
      id: 'self_story',
      author: 'Your Story',
      initials: 'ME',
      color: 'from-blue-600 to-indigo-600',
      note: state.user.story.note,
      photo: state.user.story.photo,
      timeAgo: 'Just now',
      inHuddle: !!state.activeRoom,
      room: state.activeRoom
    });

    DOM.storiesCarousel.appendChild(selfCard);
  } else {
    DOM.selfCurrentNotePill.textContent = 'Add note & pic';
    DOM.selfCurrentNotePill.className = 'text-[10px] bg-white dark:bg-dark-surface border border-google-border dark:border-dark-border text-google-subtext dark:text-dark-subtext px-2 py-0.5 rounded-full truncate max-w-[110px]';
  }

  state.stories.forEach(story => {
    const el = createStoryCardElement(story);
    DOM.storiesCarousel.appendChild(el);
  });

  lucide.createIcons();
}

function createStoryCardElement(story) {
  const card = document.createElement('div');
  card.className = 'dynamic-story-card story-card w-32 h-48 rounded-2xl bg-slate-900 border border-google-border dark:border-dark-border flex flex-col justify-between p-3 shrink-0 cursor-pointer relative overflow-hidden shadow-sm group select-none transition-all';

  const ringClass = story.inHuddle ? 'story-ring-active-call' : 'story-ring-unseen';

  card.innerHTML = `
    <img src="${story.photo}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
    <div class="absolute inset-0 story-scrim-gradient"></div>

    <div class="relative z-10 flex items-center justify-between">
      <div class="w-10 h-10 rounded-full ${ringClass} shadow-md flex items-center justify-center">
        <div class="w-full h-full rounded-full bg-gradient-to-tr ${story.color} flex items-center justify-center font-bold text-xs text-white">
          ${story.initials}
        </div>
      </div>
      ${story.inHuddle ? '<span class="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse shadow-sm">Call</span>' : ''}
    </div>

    <div class="relative z-10 flex flex-col gap-1">
      ${story.note ? `
        <div class="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl px-2 py-1 text-[11px] text-white leading-tight font-medium truncate shadow-sm">
          ${story.note}
        </div>
      ` : ''}
      <span class="text-xs font-bold text-white drop-shadow truncate">${story.author}</span>
    </div>
  `;

  card.onclick = () => openStoryViewer(story);
  return card;
}

let viewerTimer = null;
function openStoryViewer(story) {
  DOM.viewerAuthorName.textContent = story.author;
  DOM.viewerAvatar.textContent = story.initials;
  DOM.viewerTimeAgo.textContent = story.timeAgo || 'Recently';
  DOM.viewerImage.src = story.photo;
  DOM.viewerCaptionText.textContent = story.note || 'No caption';

  if (story.inHuddle) {
    DOM.viewerAvatarRing.className = 'w-10 h-10 rounded-full story-ring-active-call shadow-lg';
    DOM.viewerCallButtonLabel.textContent = `Join ${story.author.split(' ')[0]}'s Huddle (#${story.room || 'nova'})`;
    DOM.viewerJoinHuddleBtn.onclick = () => {
      closeStoryViewer();
      joinCall(story.room || 'nova-call');
    };
  } else {
    DOM.viewerAvatarRing.className = 'w-10 h-10 rounded-full story-ring-unseen shadow-lg';
    DOM.viewerCallButtonLabel.textContent = `Start Audio Call with ${story.author.split(' ')[0]}`;
    DOM.viewerJoinHuddleBtn.onclick = () => {
      closeStoryViewer();
      joinCall('direct-' + story.initials.toLowerCase());
    };
  }

  DOM.viewerProgressBar.style.width = '0%';
  DOM.storyViewerModal.classList.remove('hidden');

  setTimeout(() => {
    DOM.viewerProgressBar.style.transition = 'width 5.5s linear';
    DOM.viewerProgressBar.style.width = '100%';
  }, 50);

  clearTimeout(viewerTimer);
  viewerTimer = setTimeout(() => {
    closeStoryViewer();
  }, 5600);

  lucide.createIcons();
}

function closeStoryViewer() {
  clearTimeout(viewerTimer);
  DOM.storyViewerModal.classList.add('hidden');
  DOM.viewerProgressBar.style.transition = 'none';
  DOM.viewerProgressBar.style.width = '0%';
}

DOM.closeStoryViewerBtn.onclick = closeStoryViewer;

// ================= CREATE STORY =================
function openCreateStoryModal() {
  DOM.createStoryModal.classList.remove('hidden');
  DOM.createStoryNoteInput.value = '';
  DOM.createNoteCharCounter.textContent = '0/60';
  state.uploadedPhotoDataUrl = null;
  DOM.storyPhotoPreview.src = '';
  DOM.storyPhotoPreview.classList.add('hidden');
  DOM.storyPhotoPreviewOverlay.classList.add('hidden');
  DOM.storyUploadPlaceholder.classList.remove('hidden');
  lucide.createIcons();
}

function closeCreateStoryModal() {
  DOM.createStoryModal.classList.add('hidden');
}

DOM.createStoryCardTrigger.onclick = openCreateStoryModal;
DOM.openCreateStoryModalBtn.onclick = openCreateStoryModal;
DOM.closeCreateStoryModalBtn.onclick = closeCreateStoryModal;
DOM.cancelCreateStoryBtn.onclick = closeCreateStoryModal;

DOM.photoUploadDropzone.onclick = () => DOM.storyPhotoInput.click();

DOM.storyPhotoInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      state.uploadedPhotoDataUrl = event.target.result;
      DOM.storyPhotoPreview.src = event.target.result;
      DOM.storyPhotoPreview.classList.remove('hidden');
      DOM.storyPhotoPreviewOverlay.classList.remove('hidden');
      DOM.storyUploadPlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
};

DOM.createStoryNoteInput.oninput = (e) => {
  DOM.createNoteCharCounter.textContent = `${e.target.value.length}/60`;
};

function selectStoryQuickTag(btn) {
  if (!btn || !DOM.createStoryNoteInput) return;
  const text = btn.dataset.text || btn.textContent.trim();
  DOM.createStoryNoteInput.value = text;
  if (DOM.createNoteCharCounter) DOM.createNoteCharCounter.textContent = `${text.length}/60`;
}

function handlePublishStory() {
  const note = (DOM.createStoryNoteInput && DOM.createStoryNoteInput.value.trim()) || 'Active Story';
  const photo = state.uploadedPhotoDataUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80';

  const userStory = {
    note: note,
    photo: photo,
    created: Date.now()
  };

  state.user.story = userStory;
  localStorage.setItem('nova_user_story', JSON.stringify(userStory));

  closeCreateStoryModal();
  renderStories();
  playSound('pop');
}

document.querySelectorAll('.story-quick-tag').forEach(btn => {
  btn.onclick = () => selectStoryQuickTag(btn);
});

DOM.publishStoryBtn.onclick = handlePublishStory;

// ================= SHORTCUTS MODAL =================
function toggleShortcutsModal() {
  DOM.shortcutsModal.classList.toggle('hidden');
}
DOM.shortcutsModalBtn.onclick = toggleShortcutsModal;
DOM.closeShortcutsModalBtn.onclick = () => DOM.shortcutsModal.classList.add('hidden');

// ================= NEW MEETING & GOOGLE MEET MODALS =================
function toggleNewMeetingDropdown(e) {
  if (e) e.stopPropagation();
  if (DOM.newMeetingDropdown) {
    DOM.newMeetingDropdown.classList.toggle('hidden');
    playSound('click');
  }
}

DOM.newMeetingBtn.onclick = toggleNewMeetingDropdown;

document.addEventListener('click', (e) => {
  if (DOM.newMeetingDropdown && !DOM.newMeetingDropdown.contains(e.target) && !DOM.newMeetingBtn.contains(e.target)) {
    DOM.newMeetingDropdown.classList.add('hidden');
  }
});

DOM.instantAudioHuddleOption.onclick = () => {
  DOM.newMeetingDropdown.classList.add('hidden');
  joinCall();
};

if (DOM.createMeetingForLaterOption) {
  DOM.createMeetingForLaterOption.onclick = () => {
    DOM.newMeetingDropdown.classList.add('hidden');
    openMeetingForLaterModal();
  };
}

DOM.scheduleMeetingOption.onclick = () => {
  DOM.newMeetingDropdown.classList.add('hidden');
  openScheduleModal();
};

let generatedLaterRoomCode = '';

function openMeetingForLaterModal() {
  generatedLaterRoomCode = 'nova-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 5);
  const link = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${generatedLaterRoomCode}`;
  const input = document.getElementById('laterMeetingLinkInput');
  if (input) input.value = link;
  const modal = document.getElementById('meetingForLaterModal');
  if (modal) modal.classList.remove('hidden');
  playSound('pop');
  lucide.createIcons();
}

function closeMeetingForLaterModal() {
  const modal = document.getElementById('meetingForLaterModal');
  if (modal) modal.classList.add('hidden');
}

function copyLaterMeetingLink() {
  const input = document.getElementById('laterMeetingLinkInput');
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.getElementById('copyLaterMeetingLinkBtn');
    if (btn) {
      btn.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-emerald-300"></i>`;
      lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = `<i data-lucide="copy" class="w-4 h-4"></i>`;
        lucide.createIcons();
      }, 1800);
    }
  }).catch(() => {
    prompt("Meeting link:", input.value);
  });
}

function joinLaterMeetingNow() {
  closeMeetingForLaterModal();
  if (generatedLaterRoomCode) {
    joinCall(generatedLaterRoomCode);
  }
}

function openScheduleModal() {
  const dateInput = document.getElementById('scheduleDateInput');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
  const modal = document.getElementById('scheduleMeetingModal');
  if (modal) modal.classList.remove('hidden');
  playSound('pop');
  lucide.createIcons();
}

function closeScheduleModal() {
  const modal = document.getElementById('scheduleMeetingModal');
  if (modal) modal.classList.add('hidden');
}

function confirmScheduleMeeting() {
  const title = (document.getElementById('scheduleTitleInput') && document.getElementById('scheduleTitleInput').value.trim()) || 'Nova Team Huddle';
  const date = (document.getElementById('scheduleDateInput') && document.getElementById('scheduleDateInput').value) || new Date().toISOString().split('T')[0];
  const time = (document.getElementById('scheduleTimeInput') && document.getElementById('scheduleTimeInput').value) || '15:00';
  const code = 'nova-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 5);
  const link = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${code}`;

  const existing = JSON.parse(localStorage.getItem('nova_scheduled_meetings') || '[]');
  existing.push({ id: code, title, date, time, link, created: Date.now() });
  localStorage.setItem('nova_scheduled_meetings', JSON.stringify(existing));

  closeScheduleModal();

  navigator.clipboard.writeText(link).then(() => {
    alert(`📅 Meeting Scheduled & Link Copied!\n\nTitle: ${title}\nWhen: ${date} at ${time}\nLink: ${link}`);
  }).catch(() => {
    alert(`📅 Meeting Scheduled!\n\nTitle: ${title}\nWhen: ${date} at ${time}\nLink: ${link}`);
  });
  playSound('pop');
}

// ================= INSTALL APP HUB =================
function openInstallHubModal() {
  const modal = document.getElementById('installAppHubModal');
  if (modal) modal.classList.remove('hidden');
  playSound('pop');
  lucide.createIcons();
}

function closeInstallHubModal() {
  const modal = document.getElementById('installAppHubModal');
  if (modal) modal.classList.add('hidden');
}

function downloadWindowsApp() {
  const batContent = `@echo off\r\ntitle Nova Meet Desktop App\r\necho Starting Nova Meet Standalone...\r\nstart "" msedge --app="%~dp0index.html" 2>nul || start "" chrome --app="%~dp0index.html" 2>nul || start "" "%~dp0index.html"\r\nexit\r\n`;
  const blob = new Blob([batContent], { type: 'application/x-bat' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'NovaMeet-Windows.bat';
  a.click();
  playSound('pop');
}

function downloadLinuxApp() {
  const shContent = `#!/bin/bash\nDIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"\ngoogle-chrome --app="file://$DIR/index.html" 2>/dev/null || xdg-open "file://$DIR/index.html"\n`;
  const blob = new Blob([shContent], { type: 'application/x-sh' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'NovaMeet-Linux.sh';
  a.click();
  playSound('pop');
}

function triggerAndroidInstall() {
  if (state.deferredInstallPrompt) {
    state.deferredInstallPrompt.prompt();
    state.deferredInstallPrompt.userChoice.then(({ outcome }) => {
      if (outcome === 'accepted') {
        closeInstallHubModal();
      }
      state.deferredInstallPrompt = null;
    });
  } else {
    alert("📲 To install on Android:\n\n1. Tap Chrome's menu (⋮) in the top-right\n2. Tap 'Install app' or 'Add to Home screen'\n3. Nova Meet will be installed as a standalone full-screen app!");
  }
}

DOM.emptyStateStartHuddleBtn.onclick = () => joinCall();

// ================= ENTER CODE OR LINK & SUGGESTIONS =================
const joinCodeSuggestions = document.getElementById('joinCodeSuggestions');

if (DOM.joinMeetingInput && joinCodeSuggestions) {
  DOM.joinMeetingInput.addEventListener('focus', () => {
    joinCodeSuggestions.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!DOM.joinMeetingInput.contains(e.target) && !joinCodeSuggestions.contains(e.target)) {
      joinCodeSuggestions.classList.add('hidden');
    }
  });

  document.querySelectorAll('.join-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = chip.dataset.code;
      DOM.joinMeetingInput.value = code;
      DOM.joinMeetingBtn.disabled = false;
      joinCodeSuggestions.classList.add('hidden');
      joinCall(code);
    });
  });
}

function parseAndJoinMeetingInput() {
  let val = DOM.joinMeetingInput.value.trim();
  if (!val) return;
  if (val.includes('room=')) {
    const match = val.match(/room=([^&]+)/);
    if (match) val = match[1];
  }
  val = val.replace(/^#/, '').trim();
  if (val) joinCall(val);
}

DOM.joinMeetingInput.oninput = (e) => {
  const val = e.target.value.trim();
  DOM.joinMeetingBtn.disabled = !val;
};

DOM.joinMeetingBtn.onclick = parseAndJoinMeetingInput;

DOM.joinMeetingInput.onkeydown = (e) => {
  if (e.key === 'Enter') {
    parseAndJoinMeetingInput();
  }
};

async function testMicMeter() {
  await startAudioCapture();
  alert("🎙️ Microphone level meter is active! Speak to see the bar react.");
}

DOM.micMeterPill.onclick = testMicMeter;

// ================= IN-CALL WEBRTC AUDIO & SCREEN SHARING =================
async function joinCall(roomCode) {
  state.activeRoom = roomCode || 'nova-' + Math.random().toString(36).substring(2, 7);

  const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${state.activeRoom}`;
  window.history.pushState({ path: newUrl }, '', newUrl);

  isPipActive = false;
  const pipWidget = document.getElementById('inAppPipWidget');
  if (pipWidget) pipWidget.classList.add('hidden');

  DOM.dashboardView.classList.add('hidden');
  DOM.callsView.classList.add('hidden');
  DOM.storiesView.classList.add('hidden');
  DOM.inCallView.classList.remove('hidden');

  DOM.callRoomCodeBadge.textContent = `#${state.activeRoom}`;
  DOM.bottomMeetingCode.textContent = state.activeRoom;

  state.callSeconds = 0;
  clearInterval(state.callTimerInterval);
  state.callTimerInterval = setInterval(() => {
    state.callSeconds++;
    const mins = String(Math.floor(state.callSeconds / 60)).padStart(2, '0');
    const secs = String(state.callSeconds % 60).padStart(2, '0');
    DOM.callDuration.textContent = `${mins}:${secs}`;
    updatePipTimer();
  }, 1000);

  // Initialize participants & real-time communication bus
  initRoomParticipants();
  setupRealtimeBus(state.activeRoom);

  playSound('join');
  await startAudioCapture();
  initAnnotationCanvas();
  lucide.createIcons();
}

function leaveCall() {
  playSound('leave');
  clearInterval(state.callTimerInterval);

  isPipActive = false;
  const pipWidget = document.getElementById('inAppPipWidget');
  if (pipWidget) pipWidget.classList.add('hidden');

  // Broadcast peer leave to other participants
  broadcastRealtimeEvent('PEER_LEAVE', { userId: state.user.id });
  if (state.realtimeChannel) {
    try { state.realtimeChannel.close(); } catch (e) {}
    state.realtimeChannel = null;
  }
  if (state.sseSource) {
    try { state.sseSource.close(); } catch (e) {}
    state.sseSource = null;
  }
  state.participants = [];

  if (state.localAudioStream) {
    try {
      state.localAudioStream.getTracks().forEach(t => t.stop());
    } catch (e) {}
    state.localAudioStream = null;
  }
  if (state.animFrameId) {
    cancelAnimationFrame(state.animFrameId);
    state.animFrameId = null;
  }
  stopScreenShare();

  state.activeRoom = null;
  state.isRoomLocked = false;
  if (DOM.knockingToast) DOM.knockingToast.classList.add('hidden');
  if (DOM.inCallView) DOM.inCallView.classList.add('hidden');

  try {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (e) {}

  switchMainTab(state.currentTab || 'meetings', true);
}

if (DOM.callLeaveBtn) DOM.callLeaveBtn.onclick = leaveCall;
if (DOM.callTopLeaveBtn) DOM.callTopLeaveBtn.onclick = leaveCall;

// ================= PICTURE-IN-PICTURE (PIP) MODE =================
let isPipActive = false;

function togglePipMode() {
  if (!state.activeRoom) return;
  if (!isPipActive) {
    enterPipMode();
  } else {
    restoreFromPip();
  }
}

function enterPipMode() {
  if (!state.activeRoom) return;
  isPipActive = true;

  if (DOM.inCallView) DOM.inCallView.classList.add('hidden');
  switchMainTab(state.currentTab || 'meetings', true);

  const pipWidget = document.getElementById('inAppPipWidget');
  if (pipWidget) {
    pipWidget.classList.remove('hidden');
    const roomBadge = document.getElementById('pipRoomBadge');
    if (roomBadge) roomBadge.textContent = `#${state.activeRoom}`;

    const pipAvatarImg = document.getElementById('pipAvatarImg');
    const pipAvatarInitials = document.getElementById('pipAvatarInitials');
    if (state.user.avatar && pipAvatarImg && pipAvatarInitials) {
      pipAvatarImg.src = state.user.avatar;
      pipAvatarImg.classList.remove('hidden');
      pipAvatarInitials.classList.add('hidden');
    }
  }

  updatePipTimer();
  playSound('pop');
  lucide.createIcons();
}

function restoreFromPip() {
  isPipActive = false;
  const pipWidget = document.getElementById('inAppPipWidget');
  if (pipWidget) pipWidget.classList.add('hidden');

  DOM.dashboardView.classList.add('hidden');
  DOM.callsView.classList.add('hidden');
  DOM.storiesView.classList.add('hidden');
  DOM.inCallView.classList.remove('hidden');
  playSound('pop');
  lucide.createIcons();
}

function updatePipTimer() {
  const pipDur = document.getElementById('pipDurationDisplay');
  if (pipDur && state.callSeconds) {
    const mins = String(Math.floor(state.callSeconds / 60)).padStart(2, '0');
    const secs = String(state.callSeconds % 60).padStart(2, '0');
    pipDur.textContent = `${mins}:${secs}`;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.activeRoom && !isPipActive) {
    enterPipMode();
  }
});

async function startAudioCapture() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    state.localAudioStream = stream;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
    const source = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 64;
    source.connect(state.analyser);

    visualizeSpeaking();
    return true;
  } catch (err) {
    console.warn("Microphone not available, using simulated energy:", err);
    simulateSpeaking();
    return false;
  }
}

function visualizeSpeaking() {
  if (!state.analyser) return;
  const dataArray = new Uint8Array(state.analyser.frequencyBinCount);

  function loop() {
    state.animFrameId = requestAnimationFrame(loop);
    
    state.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    const avg = sum / dataArray.length;

    if (DOM.micVolumeBar) {
      const barWidth = Math.min(100, Math.max(10, avg * 2.2));
      DOM.micVolumeBar.style.width = `${barWidth}%`;
    }

    const popoverBar = document.getElementById('popoverMicLevelBar');
    if (popoverBar) {
      const barWidth = Math.min(100, Math.max(10, avg * 2.2));
      popoverBar.style.width = `${barWidth}%`;
    }

    const pipWave = document.getElementById('pipSpeakingWave');

    if (state.user.isMuted) {
      if (DOM.selfRipple1) DOM.selfRipple1.style.opacity = '0';
      if (DOM.selfRipple2) DOM.selfRipple2.style.opacity = '0';
      if (DOM.selfSpeakerCard) DOM.selfSpeakerCard.classList.remove('speaking-active-ring');
      if (pipWave) pipWave.style.opacity = '0';
      return;
    }

    if (avg > 16) {
      if (DOM.selfRipple1) DOM.selfRipple1.style.opacity = '0.9';
      if (DOM.selfRipple2) DOM.selfRipple2.style.opacity = '0.7';
      if (DOM.selfSpeakerCard) DOM.selfSpeakerCard.classList.add('speaking-active-ring');
      if (pipWave) pipWave.style.opacity = '0.9';

      const now = Date.now();
      if (now - state.lastSpeakingBroadcastTime > 300) {
        state.lastSpeakingBroadcastTime = now;
        broadcastRealtimeEvent('PEER_SPEAKING', { userId: state.user.id, speaking: true });
      }
    } else {
      if (DOM.selfRipple1) DOM.selfRipple1.style.opacity = '0';
      if (DOM.selfRipple2) DOM.selfRipple2.style.opacity = '0';
      if (DOM.selfSpeakerCard) DOM.selfSpeakerCard.classList.remove('speaking-active-ring');
      if (pipWave) pipWave.style.opacity = '0';

      if (state.lastSpeakingBroadcastTime > 0 && Date.now() - state.lastSpeakingBroadcastTime > 350) {
        state.lastSpeakingBroadcastTime = 0;
        broadcastRealtimeEvent('PEER_SPEAKING', { userId: state.user.id, speaking: false });
      }
    }
  }

  loop();
}

function simulateSpeaking() {
  let count = 0;
  setInterval(() => {
    const pipWave = document.getElementById('pipSpeakingWave');
    if (!state.activeRoom || state.user.isMuted) {
      if (DOM.selfRipple1) DOM.selfRipple1.style.opacity = '0';
      if (DOM.selfRipple2) DOM.selfRipple2.style.opacity = '0';
      if (DOM.selfSpeakerCard) DOM.selfSpeakerCard.classList.remove('speaking-active-ring');
      if (pipWave) pipWave.style.opacity = '0';
      return;
    }
    count++;
    if (count % 4 === 0) {
      if (DOM.selfRipple1) DOM.selfRipple1.style.opacity = '0.9';
      if (DOM.selfRipple2) DOM.selfRipple2.style.opacity = '0.7';
      if (DOM.selfSpeakerCard) DOM.selfSpeakerCard.classList.add('speaking-active-ring');
      if (pipWave) pipWave.style.opacity = '0.9';
    } else {
      if (DOM.selfRipple1) DOM.selfRipple1.style.opacity = '0';
      if (DOM.selfRipple2) DOM.selfRipple2.style.opacity = '0';
      if (DOM.selfSpeakerCard) DOM.selfSpeakerCard.classList.remove('speaking-active-ring');
      if (pipWave) pipWave.style.opacity = '0';
    }
  }, 450);
}

// ================= MIC & AUDIO SETTINGS =================
DOM.callMicToggleBtn.onclick = toggleMic;

function toggleMic() {
  state.user.isMuted = !state.user.isMuted;
  if (state.localAudioStream) {
    state.localAudioStream.getAudioTracks().forEach(t => t.enabled = !state.user.isMuted);
  }

  // Broadcast mute state in real-time
  broadcastRealtimeEvent('PEER_MUTE', { userId: state.user.id, isMuted: state.user.isMuted });
  playSound('click');

  const pipMicBtn = document.getElementById('pipMicToggleBtn');

  if (state.user.isMuted) {
    DOM.callMicToggleBtn.className = 'w-12 h-12 rounded-l-full bg-red-600 text-white flex items-center justify-center transition-all shadow-md';
    DOM.callMicToggleBtn.innerHTML = `<i data-lucide="mic-off" class="w-5 h-5"></i>`;
    if (DOM.selfMicIcon) DOM.selfMicIcon.innerHTML = `<i data-lucide="mic-off" class="w-3.5 h-3.5 text-red-400"></i>`;
    if (pipMicBtn) {
      pipMicBtn.className = 'p-2 rounded-xl bg-red-600 text-white transition-all';
      pipMicBtn.innerHTML = `<i data-lucide="mic-off" class="w-4 h-4"></i>`;
    }
  } else {
    DOM.callMicToggleBtn.className = 'w-12 h-12 rounded-l-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all';
    DOM.callMicToggleBtn.innerHTML = `<i data-lucide="mic" class="w-5 h-5"></i>`;
    if (DOM.selfMicIcon) DOM.selfMicIcon.innerHTML = `<i data-lucide="mic" class="w-3.5 h-3.5 text-white"></i>`;
    if (pipMicBtn) {
      pipMicBtn.className = 'p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all';
      pipMicBtn.innerHTML = `<i data-lucide="mic" class="w-4 h-4"></i>`;
    }
  }
  lucide.createIcons();
}

function toggleMicOptions(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('micOptionsMenu');
  if (menu) menu.classList.toggle('hidden');
  const soundboard = document.getElementById('soundboardMenu');
  if (soundboard) soundboard.classList.add('hidden');
  const reactions = document.getElementById('callReactionsMenu');
  if (reactions) reactions.classList.add('hidden');
}

function testSpeakersSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.09, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.35);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.35);
    });
  } catch (e) {
    console.log("Audio test error:", e);
  }
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.code === 'Space' && state.activeRoom) {
    e.preventDefault();
    if (!state.user.isPushToTalking) {
      state.user.isPushToTalking = true;
      if (state.user.isMuted) toggleMic();
      DOM.pushToTalkToast.classList.remove('hidden');
    }
    return;
  }

  if (e.key === 'm' || e.key === 'M') {
    if (state.activeRoom) toggleMic();
  }

  if (e.key === 's' || e.key === 'S') {
    if (state.activeRoom) toggleScreenShare();
  }

  if (e.key === 'n' || e.key === 'N') {
    if (state.activeRoom) DOM.callSidePanel.classList.toggle('hidden');
  }

  if (e.key === 'd' || e.key === 'D') {
    toggleTheme();
  }

  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    toggleShortcutsModal();
  }

  if (e.key === 'Escape') {
    DOM.shortcutsModal.classList.add('hidden');
    DOM.aiSummaryModal.classList.add('hidden');
    closeKickModal();
    closeInviteModal();
    if (DOM.kickedAlertModal) DOM.kickedAlertModal.classList.add('hidden');
    closeStoryViewer();
    closeCreateStoryModal();
    closeInstallHubModal();
    closeMeetingForLaterModal();
    closeScheduleModal();
    DOM.userProfilePopover.classList.add('hidden');
    closeSideDrawer();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && state.activeRoom && state.user.isPushToTalking) {
    state.user.isPushToTalking = false;
    if (!state.user.isMuted) toggleMic();
    DOM.pushToTalkToast.classList.add('hidden');
  }
});

// ================= SCREEN SHARING =================
DOM.callScreenShareToggleBtn.onclick = toggleScreenShare;

async function toggleScreenShare(e) {
  if (e) e.stopPropagation();
  if (state.user.isScreenSharing) {
    stopScreenShare();
  } else {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("⚠️ Screen sharing is not supported in this browser.\nOn mobile devices, screen sharing is restricted by the OS. Please open on desktop (Chrome, Edge, Firefox) or use the Windows / Linux desktop app launcher!");
        return;
      }
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });

      state.localScreenStream = displayStream;
      state.user.isScreenSharing = true;

      DOM.screenVideoPlayer.srcObject = displayStream;
      DOM.screenShareContainer.classList.remove('hidden');
      DOM.callScreenShareToggleBtn.className = 'w-12 h-12 rounded-full bg-google-blue text-white flex items-center justify-center transition-all shadow-md';

      setTimeout(initAnnotationCanvas, 300);

      const track = displayStream.getVideoTracks()[0];
      if (track) {
        track.onended = stopScreenShare;
      }

      broadcastRealtimeEvent('PEER_SCREEN_SHARE', { userId: state.user.id, isSharing: true });
      playSound('pop');

    } catch (err) {
      console.log("Screen share cancelled:", err);
      if (err.name !== 'NotAllowedError') {
        alert("Screen sharing notice: " + (err.message || 'Permission denied or not available.'));
      }
    }
  }
}

function stopScreenShare() {
  if (state.localScreenStream) {
    state.localScreenStream.getTracks().forEach(t => t.stop());
    state.localScreenStream = null;
  }
  state.user.isScreenSharing = false;
  if (DOM.screenVideoPlayer) DOM.screenVideoPlayer.srcObject = null;
  if (DOM.screenShareContainer) DOM.screenShareContainer.classList.add('hidden');
  if (DOM.callScreenShareToggleBtn) {
    DOM.callScreenShareToggleBtn.className = 'w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all';
  }
  broadcastRealtimeEvent('PEER_SCREEN_SHARE', { userId: state.user.id, isSharing: false });
}

function toggleFullscreenScreen() {
  if (!DOM.screenVideoPlayer) return;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (DOM.screenVideoPlayer.requestFullscreen) {
    DOM.screenVideoPlayer.requestFullscreen().catch(() => {});
  }
}

function copyMeetingLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert(`📋 Meeting link copied to clipboard!\n\n${url}`);
  }).catch(() => {
    prompt("Copy link:", url);
  });
}

function downloadScratchpad() {
  const text = (DOM.callNotesTextarea && DOM.callNotesTextarea.value) || '# Nova Meeting Notes\n';
  const blob = new Blob([text], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `meeting-notes-${state.activeRoom || 'nova'}.md`;
  a.click();
}

DOM.stopShareOverlayBtn.onclick = stopScreenShare;
DOM.fullscreenScreenBtn.onclick = toggleFullscreenScreen;
DOM.copyCallLinkBtn.onclick = copyMeetingLink;
DOM.downloadScratchpadBtn.onclick = downloadScratchpad;

// ================= SOUNDBOARD & REACTIONS =================
function toggleSoundboard(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('soundboardMenu');
  if (menu) menu.classList.toggle('hidden');
  const reactions = document.getElementById('callReactionsMenu');
  if (reactions) reactions.classList.add('hidden');
  const micOptions = document.getElementById('micOptionsMenu');
  if (micOptions) micOptions.classList.add('hidden');
}

function toggleReactionsMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('callReactionsMenu');
  if (menu) menu.classList.toggle('hidden');
  const soundboard = document.getElementById('soundboardMenu');
  if (soundboard) soundboard.classList.add('hidden');
  const micOptions = document.getElementById('micOptionsMenu');
  if (micOptions) micOptions.classList.add('hidden');
}

DOM.callReactionsBtn.onclick = toggleReactionsMenu;

document.addEventListener('click', (e) => {
  const micOptions = document.getElementById('micOptionsMenu');
  if (micOptions && !micOptions.contains(e.target) && (!DOM.callMicOptionsBtn || !DOM.callMicOptionsBtn.contains(e.target))) {
    micOptions.classList.add('hidden');
  }
  const sbMenu = document.getElementById('soundboardMenu');
  if (sbMenu && !sbMenu.contains(e.target) && (!DOM.dockSoundboardBtn || !DOM.dockSoundboardBtn.contains(e.target))) {
    sbMenu.classList.add('hidden');
  }
  const rMenu = document.getElementById('callReactionsMenu');
  if (rMenu && !rMenu.contains(e.target) && (!DOM.callReactionsBtn || !DOM.callReactionsBtn.contains(e.target))) {
    rMenu.classList.add('hidden');
  }
});

document.querySelectorAll('.call-emoji').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const emoji = btn.dataset.emoji;
    spawnFlyingEmoji(emoji);
    broadcastRealtimeEvent('REACTION', { emoji });
    playSound('pop');
    DOM.callReactionsMenu.classList.add('hidden');
  };
});

// Fast Multi-Particle Reaction Burst (Meet & Instagram Live Style)
function spawnFlyingEmoji(emoji) {
  const count = 6;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'flying-emoji';
      el.textContent = emoji;
      const rot = (Math.random() * 40 - 20).toFixed(1) + 'deg';
      el.style.setProperty('--rot', rot);
      const offset = (Math.random() * 200 - 100);
      el.style.left = `calc(50% + ${offset}px)`;
      const size = (2.1 + Math.random() * 0.8).toFixed(2);
      el.style.fontSize = `${size}rem`;
      DOM.flyingReactionsContainer.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }, i * 60);
  }
}

// Global window bindings for inline HTML event attributes
window.openSideDrawer = openSideDrawer;
window.closeSideDrawer = closeSideDrawer;
window.switchMainTab = switchMainTab;
window.openInstallHubModal = openInstallHubModal;
window.closeInstallHubModal = closeInstallHubModal;
window.downloadWindowsApp = downloadWindowsApp;
window.downloadLinuxApp = downloadLinuxApp;
window.triggerAndroidInstall = triggerAndroidInstall;
window.testMicMeter = testMicMeter;
window.parseAndJoinMeetingInput = parseAndJoinMeetingInput;
window.toggleNewMeetingDropdown = toggleNewMeetingDropdown;
window.joinCall = joinCall;
window.leaveCall = leaveCall;
window.openMeetingForLaterModal = openMeetingForLaterModal;
window.closeMeetingForLaterModal = closeMeetingForLaterModal;
window.copyLaterMeetingLink = copyLaterMeetingLink;
window.joinLaterMeetingNow = joinLaterMeetingNow;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.confirmScheduleMeeting = confirmScheduleMeeting;
window.toggleTheme = toggleTheme;
window.toggleShortcutsModal = toggleShortcutsModal;
window.toggleUserProfilePopover = toggleUserProfilePopover;
window.saveAndCloseProfile = saveAndCloseProfile;
window.changeCalendarDate = changeCalendarDate;
window.selectCalendarDay = selectCalendarDay;
window.openCreateStoryModal = openCreateStoryModal;
window.closeCreateStoryModal = closeCreateStoryModal;
window.selectStoryQuickTag = selectStoryQuickTag;
window.handlePublishStory = handlePublishStory;
window.closeStoryViewer = closeStoryViewer;
window.openInviteModal = openInviteModal;
window.closeInviteModal = closeInviteModal;
window.copyInviteLinkModal = copyInviteLinkModal;
window.addTeammateToCall = addTeammateToCall;
window.muteAllParticipants = muteAllParticipants;
window.toggleMuteParticipant = toggleMuteParticipant;
window.confirmKickParticipant = confirmKickParticipant;
window.closeKickModal = closeKickModal;
window.executeKickConfirmed = executeKickConfirmed;
window.denyKnock = denyKnock;
window.admitKnock = admitKnock;
window.toggleRoomLock = toggleRoomLock;
window.generateAiMeetingSummary = generateAiMeetingSummary;
window.closeAiSummaryModal = closeAiSummaryModal;
window.copyAiSummary = copyAiSummary;
window.exportAiSummary = exportAiSummary;
window.copyMeetingLink = copyMeetingLink;
window.togglePipMode = togglePipMode;
window.restoreFromPip = restoreFromPip;
window.setAnnotationTool = setAnnotationTool;
window.setAnnotationColor = setAnnotationColor;
window.clearAnnotations = clearAnnotations;
window.toggleFullscreenScreen = toggleFullscreenScreen;
window.stopScreenShare = stopScreenShare;
window.switchSidePanelTab = switchSidePanelTab;
window.downloadScratchpad = downloadScratchpad;
window.handleSendChatMessage = handleSendChatMessage;
window.toggleMic = toggleMic;
window.toggleMicOptions = toggleMicOptions;
window.testSpeakersSound = testSpeakersSound;
window.toggleScreenShare = toggleScreenShare;
window.toggleSoundboard = toggleSoundboard;
window.toggleReactionsMenu = toggleReactionsMenu;

// ================= INITIALIZATION =================
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  renderStories();
  renderContacts();

  if (state.user.name) {
    DOM.popoverNameInput.value = state.user.name;
    if (DOM.selfSpeakerNameLabel) DOM.selfSpeakerNameLabel.textContent = state.user.name;
  }

  // Restore permanent avatar if saved
  if (state.user.avatar) {
    updateUserAvatar(state.user.avatar);
  }

  // Make sure inCallView is hidden initially
  if (DOM.inCallView) DOM.inCallView.classList.add('hidden');

  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (room) {
    // Clear room from URL immediately to prevent reload loop
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {}

    const ok = confirm(`🔗 You have an invite to join Nova Meet room "#${room}"!\n\nDo you want to enter now?`);
    if (ok) {
      joinCall(room);
    } else {
      switchMainTab('meetings', true);
    }
  } else {
    switchMainTab('meetings', true);
  }
});
