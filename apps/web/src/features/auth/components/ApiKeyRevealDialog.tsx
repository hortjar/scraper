import { useTranslation } from "react-i18next"

import { CopyableCode } from "../../../components/molecules/CopyableCode"
import { Button } from "../../../components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/Dialog"

export interface ApiKeyRevealDialogProperties {
  readonly apiKeyValue: string | undefined
  readonly onAcknowledge: () => void
}

export const ApiKeyRevealDialog = ({
  apiKeyValue,
  onAcknowledge,
}: ApiKeyRevealDialogProperties) => {
  const { t } = useTranslation("settings")

  return (
    <Dialog open={apiKeyValue !== undefined}>
      <DialogContent
        onInteractOutside={(event) => {
          event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("apiKeys.revealTitle")}</DialogTitle>
          <DialogDescription>{t("apiKeys.revealDescription")}</DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4">
          <CopyableCode value={apiKeyValue ?? ""} />
        </div>
        <DialogFooter>
          <Button variant="primary" onClick={onAcknowledge}>
            {t("apiKeys.revealAcknowledge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
