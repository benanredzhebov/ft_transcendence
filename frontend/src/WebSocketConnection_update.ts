/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   WebSocketConnection_update.ts                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: beredzhe <beredzhe@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/17 10:23:29 by beredzhe          #+#    #+#             */
/*   Updated: 2025/04/17 10:24:03 by beredzhe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { io } from "socket.io-client";

const socket = io('wss://localhost:3000', {
    transports: ['websocket'],
    secure: true
  });

// Example usage of the socket to listen for an event
socket.on('connect', () => {
    console.log('Connected to WebSocket server');
});
  