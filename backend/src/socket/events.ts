/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   events.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: benanredzhebov <benanredzhebov@student.    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/12 15:43:34 by benanredzhe       #+#    #+#             */
/*   Updated: 2025/04/14 16:29:11 by benanredzhe      ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* All WS event names (shared between client/server) */

export const WS_EVENTS = {
	CREATE_ROOM: "create_room",
	JOIN_ROOM: "join_room",
	ROOM_READY: "room_ready",
	PLAYER_MOVE: "player_move",
	STATE_UPDATE: "state_update",
	SCORE_UPDATE: "score_update",
	MATCH_END: "match_end",
	PLAYER_DISCONNECT: "player_disconnect",
  };