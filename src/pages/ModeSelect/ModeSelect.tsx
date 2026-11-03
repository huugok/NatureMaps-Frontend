import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { MODES } from '../../constants/modes'
import { useApp } from '../../context/useApp'

/** Selección de modo. El modo condiciona el contenido; la paleta verde es fija. */
export function ModeSelect() {
  const { mode, setMode, t } = useApp()
  const navigate = useNavigate()

  return (
    <Page title={t('mode.title')} subtitle={t('mode.subtitle')}>
      <List>
        {MODES.map((m) => (
          <ListItem
            key={m.mode}
            icon={m.icon}
            title={t(m.titleKey)}
            subtitle={t(m.descriptionKey)}
            selected={mode === m.mode}
            onClick={() => {
              setMode(m.mode)
              navigate('/inicio', { replace: true })
            }}
          />
        ))}
      </List>
    </Page>
  )
}
