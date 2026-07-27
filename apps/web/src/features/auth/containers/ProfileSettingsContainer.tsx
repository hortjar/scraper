import { LoadingState } from "../../../components/organisms/LoadingState"
import { useSession } from "../use-session"

import { ProfileSettingsFields } from "./ProfileSettingsFields"

export const ProfileSettingsContainer = () => {
  const { user, isLoading } = useSession()

  if (isLoading || user === undefined) return <LoadingState rows={2} />

  return <ProfileSettingsFields key={user.id} user={user} />
}
