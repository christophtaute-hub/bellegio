-- log_team_change() ist als SECURITY DEFINER-Funktion sonst direkt per
-- RPC (/rest/v1/rpc/log_team_change) durch jeden angemeldeten Nutzer
-- aufrufbar, unabhängig vom eigentlichen UPDATE/INSERT-Trigger-Kontext —
-- das würde erlauben, gefälschte Audit-Log-Zeilen für beliebige team_id
-- einzuschleusen. Ausführung auf den Trigger-Kontext beschränken.
revoke execute on function public.log_team_change() from public, anon, authenticated;
