import type { TabConfig } from '../../types/navigation';
import { dictionaries } from '../../i18n/strings';
import {
  HomeNavIcon,
  SproutNavIcon,
  CameraNavIcon,
  RoutesNavIcon,
  SearchNavIcon,
} from './icons';

export const DEFAULT_TABS: TabConfig[] = [
  {
    id: 'inicio',
    label: dictionaries.es['nav.home'],
    icon: HomeNavIcon,
    ariaLabel: dictionaries.es['nav.home.aria'],
  },
  {
    id: 'mapa',
    label: dictionaries.es['nav.map'],
    icon: SproutNavIcon,
    ariaLabel: dictionaries.es['nav.map.aria'],
  },
  {
    id: 'escanear',
    label: dictionaries.es['nav.scan'],
    icon: CameraNavIcon,
    ariaLabel: dictionaries.es['nav.scan.aria'],
  },
  {
    id: 'rutas',
    label: dictionaries.es['nav.routes'],
    icon: RoutesNavIcon,
    ariaLabel: dictionaries.es['nav.routes.aria'],
  },
  {
    id: 'buscar',
    label: dictionaries.es['nav.search'],
    icon: SearchNavIcon,
    ariaLabel: dictionaries.es['nav.search.aria'],
  },
];

