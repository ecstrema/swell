// Import icons using unplugin-icons
import HomeIcon from '~icons/mdi/home?raw';
import FileIcon from '~icons/mdi/file-document?raw';
import FolderIcon from '~icons/mdi/folder-open?raw';
import SettingsIcon from '~icons/mdi/settings?raw';
import AccountIcon from '~icons/mdi/account?raw';
import HeartIcon from '~icons/mdi/heart?raw';
import StarIcon from '~icons/mdi/star?raw';
import BellIcon from '~icons/mdi/bell?raw';
import SearchIcon from '~icons/mdi/magnify?raw';
import CloseIcon from '~icons/mdi/close?raw';
import CheckIcon from '~icons/mdi/check?raw';
import DeleteIcon from '~icons/mdi/delete?raw';

// Button icons
import PlusIcon from '~icons/mdi/plus?raw';
import EditIcon from '~icons/mdi/pencil?raw';
import DownloadIcon from '~icons/mdi/download?raw';
import ShareIcon from '~icons/mdi/share?raw';

// Color demo icons
import InfoIcon from '~icons/mdi/information?raw';
import CheckCircleIcon from '~icons/mdi/check-circle?raw';
import AlertIcon from '~icons/mdi/alert?raw';
import CloseCircleIcon from '~icons/mdi/close-circle?raw';

// Icon sets
import MdiCogIcon from '~icons/mdi/cog?raw';
import MdiPlayIcon from '~icons/mdi/play?raw';
import FaSolidHomeIcon from '~icons/fa-solid/home?raw';
import FaSolidUserIcon from '~icons/fa-solid/user?raw';
import FaSolidGearIcon from '~icons/fa-solid/gear?raw';
import FaSolidPlayIcon from '~icons/fa-solid/play?raw';
import BiHouseIcon from '~icons/bi/house?raw';
import BiPersonIcon from '~icons/bi/person?raw';
import BiGearIcon from '~icons/bi/gear?raw';
import BiPlayIcon from '~icons/bi/play?raw';
import LucideHomeIcon from '~icons/lucide/home?raw';
import LucideUserIcon from '~icons/lucide/user?raw';
import LucideSettingsIcon from '~icons/lucide/settings?raw';
import LucidePlayIcon from '~icons/lucide/play?raw';

// Helper function to create an icon wrapper
function createIconWrapper(iconSvg: string, label?: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'icon-item';
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'icon-wrapper';
  iconSpan.innerHTML = iconSvg;
  wrapper.appendChild(iconSpan);
  
  if (label) {
    const labelSpan = document.createElement('span');
    labelSpan.className = 'icon-label';
    labelSpan.textContent = label;
    wrapper.appendChild(labelSpan);
  }
  
  return wrapper;
}

// Helper to create icon with inline SVG
function createIcon(iconSvg: string, className?: string): HTMLElement {
  const span = document.createElement('span');
  span.className = className || 'icon-wrapper';
  span.innerHTML = iconSvg;
  return span;
}

// Populate main icons grid
const iconsContainer = document.getElementById('icons-container');
if (iconsContainer) {
  const icons = [
    { svg: HomeIcon, label: '~icons/mdi/home' },
    { svg: FileIcon, label: '~icons/mdi/file-document' },
    { svg: FolderIcon, label: '~icons/mdi/folder-open' },
    { svg: SettingsIcon, label: '~icons/mdi/settings' },
    { svg: AccountIcon, label: '~icons/mdi/account' },
    { svg: HeartIcon, label: '~icons/mdi/heart' },
    { svg: StarIcon, label: '~icons/mdi/star' },
    { svg: BellIcon, label: '~icons/mdi/bell' },
    { svg: SearchIcon, label: '~icons/mdi/magnify' },
    { svg: CloseIcon, label: '~icons/mdi/close' },
    { svg: CheckIcon, label: '~icons/mdi/check' },
    { svg: DeleteIcon, label: '~icons/mdi/delete' },
  ];
  
  icons.forEach(({ svg, label }) => {
    iconsContainer.appendChild(createIconWrapper(svg, label));
  });
}

// Populate buttons
const buttonsContainer = document.getElementById('buttons-container');
if (buttonsContainer) {
  const buttons = [
    { icon: PlusIcon, text: 'Add Item', className: 'primary' },
    { icon: EditIcon, text: 'Edit', className: '' },
    { icon: DeleteIcon, text: 'Delete', className: 'danger' },
    { icon: CheckIcon, text: 'Save', className: 'success' },
    { icon: DownloadIcon, text: 'Download', className: '' },
    { icon: ShareIcon, text: 'Share', className: '' },
  ];
  
  buttons.forEach(({ icon, text, className }) => {
    const button = document.createElement('button');
    button.className = `demo-button ${className}`;
    button.innerHTML = `${icon} <span>${text}</span>`;
    buttonsContainer.appendChild(button);
  });
}

// Populate size examples
const sizesContainer = document.getElementById('sizes-container');
if (sizesContainer) {
  const sizes = ['16px', '24px', '32px', '48px', '64px'];
  
  sizes.forEach(size => {
    const item = document.createElement('div');
    item.className = 'size-demo-item';
    
    const iconWrapper = createIcon(HeartIcon);
    const svg = iconWrapper.querySelector('svg');
    if (svg) {
      svg.style.width = size;
      svg.style.height = size;
      svg.style.color = '#e74c3c';
    }
    
    const label = document.createElement('div');
    label.className = 'size-label';
    label.textContent = size;
    
    item.appendChild(iconWrapper);
    item.appendChild(label);
    sizesContainer.appendChild(item);
  });
}

// Populate color examples
const colorsContainer = document.getElementById('colors-container');
if (colorsContainer) {
  const colorIcons = [
    { svg: StarIcon, color: '#f39c12' },
    { svg: HeartIcon, color: '#e74c3c' },
    { svg: InfoIcon, color: '#3498db' },
    { svg: CheckCircleIcon, color: '#27ae60' },
    { svg: AlertIcon, color: '#e67e22' },
    { svg: CloseCircleIcon, color: '#c0392b' },
  ];
  
  colorIcons.forEach(({ svg, color }) => {
    const iconWrapper = createIcon(svg);
    const svgEl = iconWrapper.querySelector('svg');
    if (svgEl) {
      svgEl.style.color = color;
    }
    colorsContainer.appendChild(iconWrapper);
  });
}

// Populate icon sets
const setsContainer = document.getElementById('sets-container');
if (setsContainer) {
  const iconSets = [
    {
      title: 'Material Design Icons (mdi:)',
      icons: [
        { svg: HomeIcon, label: '~icons/mdi/home' },
        { svg: AccountIcon, label: '~icons/mdi/account' },
        { svg: MdiCogIcon, label: '~icons/mdi/cog' },
        { svg: MdiPlayIcon, label: '~icons/mdi/play' },
      ]
    },
    {
      title: 'Font Awesome (fa-solid:)',
      icons: [
        { svg: FaSolidHomeIcon, label: '~icons/fa-solid/home' },
        { svg: FaSolidUserIcon, label: '~icons/fa-solid/user' },
        { svg: FaSolidGearIcon, label: '~icons/fa-solid/gear' },
        { svg: FaSolidPlayIcon, label: '~icons/fa-solid/play' },
      ]
    },
    {
      title: 'Bootstrap Icons (bi:)',
      icons: [
        { svg: BiHouseIcon, label: '~icons/bi/house' },
        { svg: BiPersonIcon, label: '~icons/bi/person' },
        { svg: BiGearIcon, label: '~icons/bi/gear' },
        { svg: BiPlayIcon, label: '~icons/bi/play' },
      ]
    },
    {
      title: 'Lucide Icons (lucide:)',
      icons: [
        { svg: LucideHomeIcon, label: '~icons/lucide/home' },
        { svg: LucideUserIcon, label: '~icons/lucide/user' },
        { svg: LucideSettingsIcon, label: '~icons/lucide/settings' },
        { svg: LucidePlayIcon, label: '~icons/lucide/play' },
      ]
    },
  ];
  
  iconSets.forEach(set => {
    const section = document.createElement('div');
    section.className = 'icon-set-section';
    
    const title = document.createElement('div');
    title.className = 'icon-set-title';
    title.textContent = set.title;
    section.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'icon-grid';
    
    set.icons.forEach(({ svg, label }) => {
      grid.appendChild(createIconWrapper(svg, label));
    });
    
    section.appendChild(grid);
    setsContainer.appendChild(section);
  });
}
