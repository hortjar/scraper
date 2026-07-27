import { useTranslation } from "react-i18next"

import { CopyableCode } from "../../../components/molecules/CopyableCode"
import { Badge } from "../../../components/ui/Badge"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card"
import { SELECTOR_KIND_LABEL, VALUE_TYPE_LABEL } from "../label-keys"
import type { MonitorExtractor } from "../types"

export interface MonitorExtractorsProperties {
  readonly extractors: readonly MonitorExtractor[]
}

export const MonitorExtractors = ({ extractors }: MonitorExtractorsProperties) => {
  const { t } = useTranslation("monitors")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.extractorsTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {extractors.length === 0 ? (
          <p className="text-small text-ink-subtle">{t("detail.extractorsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {extractors.map((extractor) => (
              <li key={extractor.id} className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{extractor.label}</span>
                  <Badge tone="neutral">{extractor.key}</Badge>
                  <Badge tone="outline">{t(VALUE_TYPE_LABEL[extractor.valueType])}</Badge>
                  <Badge tone="outline">{t(SELECTOR_KIND_LABEL[extractor.selectorKind])}</Badge>
                </div>
                <CopyableCode value={extractor.selector} truncate />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
