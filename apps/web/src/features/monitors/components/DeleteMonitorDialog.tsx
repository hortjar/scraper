import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/Dialog"

export interface DeleteMonitorDialogProperties {
  readonly monitorName: string | undefined
  readonly pending: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export const DeleteMonitorDialog = ({
  monitorName,
  pending,
  onConfirm,
  onCancel,
}: DeleteMonitorDialogProperties) => {
  const { t } = useTranslation("monitors")
  const { t: tCommon } = useTranslation("common")

  return (
    <Dialog
      open={monitorName !== undefined}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("delete.title")}</DialogTitle>
          <DialogDescription>
            {t("delete.description", { name: monitorName ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {tCommon("actions.cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {t("delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
