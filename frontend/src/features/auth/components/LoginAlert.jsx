import React from "react";
import { useTranslation } from "react-i18next";

import IpAlert from "../../../components/forms/IpAlert";

export default function LoginAlert({message}) {
    const { t } = useTranslation('common');

    if (!message) return null;

    return(
        <IpAlert 
            text={message}
            severity="error"
            title={t("alert_message.error")}
        />
    );
}