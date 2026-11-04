import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { getReportPeriod } from "../utils/reportPreview";

export function useReportReadings(reportId) {
  const period = useMemo(() => getReportPeriod(reportId), [reportId]);
  const [result, setResult] = useState({ reportId, data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    api.reportReadings(period.start.toISOString(), period.endExclusive.toISOString())
      .then((result) => {
        if (active) setResult({ reportId, data: result, loading: false, error: null });
      })
      .catch((requestError) => {
        if (active) setResult({ reportId, data: null, loading: false, error: requestError });
      });

    return () => {
      active = false;
    };
  }, [period, reportId]);

  return result.reportId === reportId
    ? result
    : { reportId, data: null, loading: true, error: null };
}
