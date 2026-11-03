import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { MODES } from '../../constants/modes'
import { useApp } from '../../context/useApp'

/** Selección de modo. Al elegir uno, toda la app cambia su color de acento. */
export function ModeSelect() {
  const { mode, setMode } = useApp()
  const navigate = useNavigate()

  return (
    <Page title="¿Cómo quieres explorar Valencia?" subtitle="Elige un modo — puedes cambiarlo luego en Ajustes">
      <List>
        {MODES.map((m) => (
          <ListItem
            key={m.mode}
            icon={m.icon}
            title={m.title}
            subtitle={m.description}
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
