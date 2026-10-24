import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { MODES } from '../../constants/modes'
import { useApp } from '../../context/useApp'

/** Selección de modo. Al elegir uno, toda la app cambia su color de acento. */
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
            title={t(m.title)}
            subtitle={t(m.description)}
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
