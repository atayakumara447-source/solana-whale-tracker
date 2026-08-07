--
-- PostgreSQL database dump
--

\restrict 1TPbH55OQt2LyYguF4kEM7g5i0dGbXVRpTyKFUZnjmIMSknMeqY1vuxFSQIgeng

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, signature, wallet_address, amount, token, block_time, created_at, type, price_usd) FROM stdin;
1	4D9bTCcduU9yRXb14XnCWUQkufyKTkxJfPkm7kjD3DjDfddBsGzcgRc8muBgWMT4daP3auconzDr2cThLT9DAAor	3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib	2484.998991000	SOL	2026-08-06 14:32:50	2026-08-06 14:34:14.837432	\N	\N
2	DUMMY_BUY_BONK_ee36fe794800	3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib	1000000.000000000	BONK	2026-08-04 12:13:59.058707	2026-08-07 12:13:59.058707	buy	0.00002000
3	DUMMY_SELL_BONK_effddb4d9749	3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib	1000000.000000000	BONK	2026-08-05 12:13:59.058707	2026-08-07 12:13:59.058707	sell	0.00003000
4	DUMMY_BUY_WIF_53393b39a840	3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib	100.000000000	WIF	2026-08-06 00:13:59.109842	2026-08-07 12:13:59.109842	buy	2.50000000
5	DUMMY_SELL_WIF_5e672a5499eb	3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib	100.000000000	WIF	2026-08-07 06:13:59.109842	2026-08-07 12:13:59.109842	sell	2.10000000
\.


--
-- Data for Name: watched_wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.watched_wallets (id, wallet_address, label, created_at) FROM stdin;
1	5tzFkiKscXHK5ZXCGbXZxLtszgYVCF3IPWLW2j4YCotr	Binance Cold Wallet	2026-08-06 16:27:19.130987
2	9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM	Binance Hot Wallet 2	2026-08-07 00:01:08.960146
3	H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS	Coinbase Wallet	2026-08-07 00:11:10.933466
4	So11111111111111111111111111111111111111112	Wrapped SOL Program	2026-08-07 00:12:46.769776
5	3ADzk5YDP9sgorvPSs9YPxigJiSqhgddpwHwwPwmEFib	Wallet Dummy Testing	2026-08-07 12:13:59.005961
6	7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU	Wallet Test Import 1	2026-08-07 12:46:45.045853
\.


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 5, true);


--
-- Name: watched_wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.watched_wallets_id_seq', 7, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 1TPbH55OQt2LyYguF4kEM7g5i0dGbXVRpTyKFUZnjmIMSknMeqY1vuxFSQIgeng

