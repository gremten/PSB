import { Block, Cell, Header, Screen } from "@/components/ui";

export default function MorePage() {
  return <Screen><Header title="Ещё" /><Block><Cell label="Настройки" leading="⚙" dataTrack="more.settings.open" /><Cell label="Помощь" leading="?" dataTrack="more.help.open" /></Block></Screen>;
}
