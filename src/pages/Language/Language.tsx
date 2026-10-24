import { Page } from '../../components/Page'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { Radio } from '../../components/ui/Radio'
import { useApp } from '../../context/useApp'
import { LANG_LABELS } from '../../i18n/strings'
import type { Lang } from '../../types'

/** Selector de idioma (/ajustes/idioma). El cambio se aplica al instante en toda la app. */
export function Language() {
  const { t, lang, setLang } = useApp()
  return (
    <Page title={t('settings.language')} back>
      <List>
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <ListItem key={l} title={LANG_LABELS[l]} selected={lang === l} trailing={<Radio checked={lang === l} />} onClick={() => setLang(l)} />
        ))}
      </List>
    </Page>
  )
}
