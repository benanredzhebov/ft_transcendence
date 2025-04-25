/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   WebSocket.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pfalli <pfalli@student.42wolfsburg.de>     +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/17 10:23:29 by beredzhe          #+#    #+#             */
/*   Updated: 2025/04/23 15:31:31 by pfalli           ###   ########.fr       */
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
  