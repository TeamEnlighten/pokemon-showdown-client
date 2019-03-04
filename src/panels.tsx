/**
 * Panels
 *
 * Main view - sets up the frame, topbar, and the generic panels.
 *
 * Also sets up global event listeners.
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license AGPLv3
 */

class PSRouter {
	roomid = '' as RoomID;
	panelState = '';
	constructor() {
		const currentRoomid = location.pathname.slice(1);
		if (/^[a-z0-9-]+$/.test(currentRoomid)) {
			this.subscribeHistory();
		} else if (location.pathname.endsWith('.html')) {
			this.subscribeHash();
		}
	}
	subscribeHash() {
		if (location.hash) {
			const currentRoomid = location.hash.slice(1);
			if (/^[a-z0-9-]+$/.test(currentRoomid)) {
				PS.join(currentRoomid as RoomID);
			} else {
				return;
			}
		}
		PS.subscribeAndRun(() => {
			const roomid = PS.room.id;
			location.hash = roomid ? '#' + roomid : '';
		});
		window.addEventListener('hashchange', e => {
			const possibleRoomid = location.hash.slice(1);
			let currentRoomid: RoomID | null = null;
			if (/^[a-z0-9-]*$/.test(possibleRoomid)) {
				currentRoomid = possibleRoomid as RoomID;
			}
			if (currentRoomid !== null) {
				PS.join(currentRoomid);
			}
		});
	}
	subscribeHistory() {
		const currentRoomid = location.pathname.slice(1);
		if (/^[a-z0-9-]+$/.test(currentRoomid)) {
			PS.join(currentRoomid as RoomID);
		} else {
			return;
		}
		if (!window.history) return;
		PS.subscribeAndRun(() => {
			const room = PS.room;
			const roomid = room.id;
			const panelState = (PS.leftRoomWidth ?
				PS.leftRoom.id + '..' + PS.rightRoom!.id :
				roomid);
			if (roomid === this.roomid && panelState === this.panelState) {
				return;
			}
			if (panelState === this.panelState) {
				history.pushState(panelState, room.title, '/' + roomid);
			} else {
				history.replaceState(panelState, room.title, '/' + roomid);
			}
			this.roomid = roomid;
			this.panelState = panelState;
		});
		window.addEventListener('popstate', e => {
			const possibleRoomid = location.pathname.slice(1);
			let roomid: RoomID | null = null;
			if (/^[a-z0-9-]*$/.test(possibleRoomid)) {
				roomid = possibleRoomid as RoomID;
			}
			if (typeof e.state === 'string') {
				const [leftRoomid, rightRoomid] = e.state.split('..') as RoomID[];
				PS.join(leftRoomid, 'left');
				if (rightRoomid) {
					PS.join(rightRoomid, 'right');
				}
			}
			if (roomid !== null) {
				PS.join(roomid);
			}
		});
	}
}
PS.router = new PSRouter();

class PSHeader extends preact.Component<{style: {}}> {
	renderRoomTab(id: RoomID) {
		const room = PS.rooms[id]!;
		const closable = (id === '' || id === 'rooms' ? '' : ' closable');
		const cur = PS.isVisible(room) ? ' cur' : '';
		let className = `roomtab button${room.notifying}${closable}${cur}`;
		let icon = null;
		let title = room.title;
		let closeButton = null;
		switch (room.type) {
		case '':
		case 'mainmenu':
			icon = <i class="fa fa-home"></i>;
			break;
		case 'teambuilder':
			icon = <i class="fa fa-pencil-square-o"></i>;
			break;
		case 'ladder':
			icon = <i class="fa fa-list-ol"></i>;
			break;
		case 'battles':
			icon = <i class="fa fa-caret-square-o-right"></i>;
			break;
		case 'rooms':
			icon = <i class="fa fa-plus" style="margin:7px auto -6px auto"></i>;
			title = '';
			break;
		case 'battle':
			let idChunks = id.substr(7).split('-');
			let formatid;
			// TODO: relocate to room implementation
			if (idChunks.length <= 1) {
				if (idChunks[0] === 'uploadedreplay') formatid = 'Uploaded Replay';
			} else {
				formatid = idChunks[idChunks.length - 2];
			}
			if (!title) {
				let battle = (room as any).battle;
				let p1 = (battle && battle.p1 && battle.p1.name) || '';
				let p2 = (battle && battle.p2 && battle.p2.name) || '';
				if (p1 && p2) {
					title = '' + p1 + ' v. ' + p2;
				} else if (p1 || p2) {
					title = '' + p1 + p2;
				} else {
					title = '(empty room)';
				}
			}
			icon = <i class="text">{formatid}</i>;
			break;
		case 'chat':
			icon = <i class="fa fa-comment-o"></i>;
			break;
		case 'html':
		default:
			if (title.charAt(0) === '[') {
				let closeBracketIndex = title.indexOf(']');
				if (closeBracketIndex > 0) {
					icon = <i class="text">{title.slice(1, closeBracketIndex)}</i>;
					title = title.slice(closeBracketIndex + 1);
					break;
				}
			}
			icon = <i class="fa fa-file-text-o"></i>;
			break;
		}
		if (closable) {
			closeButton = <button class="closebutton" name="closeRoom" value={id} aria-label="Close"><i class="fa fa-times-circle"></i></button>;
		}
		return <li><a class={className} href={`/${id}`} draggable={true}>{icon} <span>{title}</span></a>{closeButton}</li>;
	}
	render() {
		return <div id="header" class="header" style={this.props.style}>
			<img class="logo" src="https://play.pokemonshowdown.com/pokemonshowdownbeta.png" srcset="https://play.pokemonshowdown.com/pokemonshowdownbeta@2x.png 2x" alt="Pokémon Showdown! (beta)" width="146" height="44" />
			<div class="maintabbarbottom"></div>
			<div class="tabbar maintabbar"><div class="inner">
				<ul>
					{PS.leftRoomList.map(roomid => this.renderRoomTab(roomid))}
				</ul>
				<ul class="siderooms" style={{float: 'none', marginLeft: PS.leftRoomWidth - 144}}>
					{PS.rightRoomList.map(roomid => this.renderRoomTab(roomid))}
				</ul>
			</div></div>
			<div class="userbar">
				<span class="username" data-name={PS.user.name} style="color:hsl(96,67%,36%);"><i class="fa fa-user" style="color:#779EC5"></i> {PS.user.name}</span>{' '}
				<button class="icon button" name="joinRoom" value="volume" title="Sound" aria-label="Sound"><i class="fa fa-volume-up"></i></button>{' '}
				<button class="icon button" name="joinRoom" value="options" title="Options" aria-label="Options"><i class="fa fa-cog"></i></button>
			</div>
		</div>;
	}
}

class PSRoomPanel extends preact.Component<{style: {}, room: PSRoom}> {
	render() {
		if (this.props.room.side === 'popup') {
			return <div class="ps-popup" id={`room-${this.props.room.id}`} style={this.props.style}>
				<div class="mainmessage"><p>Loading...</p></div>
			</div>;
		}
		return <div class="ps-room ps-room-light" id={`room-${this.props.room.id}`} style={this.props.style}>
			<div class="mainmessage"><p>Loading...</p></div>
		</div>;
	}
}

class PSMain extends preact.Component {
	constructor() {
		super();
		PS.subscribe(() => this.forceUpdate());

		window.addEventListener('click', e => {
			let elem = e.target as HTMLElement | null;
			if (elem && elem.className === 'ps-overlay') {
				PS.closePopup();
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}
			while (elem) {
				if (elem.tagName === 'A') {
					const roomid = this.roomidFromLink(elem as HTMLAnchorElement);
					if (roomid !== null) {
						PS.addRoom({
							id: roomid,
							parentElem: elem,
						});
						PS.update();
						e.preventDefault();
						e.stopImmediatePropagation();
						return;
					}
				}
				if (elem.tagName === 'BUTTON') {
					if (this.buttonClick(elem as HTMLButtonElement)) {
						e.preventDefault();
						e.stopImmediatePropagation();
						return;
					}
				}
				elem = elem.parentElement;
			}
		});

		window.addEventListener('keydown', e => {
			let elem = e.target as HTMLInputElement | null;
			if (elem) {
				let isTextInput = (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA');
				if (isTextInput && (elem.type === 'button' || elem.type === 'radio' || elem.type === 'checkbox' || elem.type === 'file')) {
					isTextInput = false;
				}
				if (isTextInput && elem.value) {
					return;
				}
			}
			if (PS.room.onParentEvent) {
				if (PS.room.onParentEvent('keydown', e) === false) {
					e.stopImmediatePropagation();
					e.preventDefault();
					return;
				}
			}
			let modifierKey = e.ctrlKey || e.altKey || e.metaKey || e.shiftKey;
			if (modifierKey) return;
			if (e.keyCode === 37) { // left
				PS.arrowKeysUsed = true;
				PS.focusLeftRoom();
			} else if (e.keyCode === 39) { // right
				PS.arrowKeysUsed = true;
				PS.focusRightRoom();
			}
		});

		PS.prefs.subscribeAndRun(() => {
			document.body.className = PS.prefs.dark ? 'dark' : '';
		});
	}
	buttonClick(elem: HTMLButtonElement) {
		switch (elem.name) {
		case 'closeRoom':
			PS.leave(elem.value as RoomID);
			return true;
		case 'joinRoom':
			PS.addRoom({
				id: elem.value as RoomID,
				parentElem: elem,
			});
			PS.update();
			return true;
		}
		return false;
	}
	roomidFromLink(elem: HTMLAnchorElement) {
		if (PS.server.id === 'showdown') {
			if (elem.host && elem.host !== 'play.pokemonshowdown.com' && elem.host !== 'psim.us') {
				return null;
			}
		} else {
			if (elem.host !== location.host) {
				return null;
			}
		}
		const roomid = elem.pathname.slice(1);
		if (!/^[a-z0-9-]*$/.test(roomid)) {
			return null; // not a roomid
		}
		const redirects = /^(appeals?|rooms?suggestions?|suggestions?|adminrequests?|bugs?|bugreports?|rules?|faq|credits?|news|privacy|contact|dex|insecure)$/;
		if (redirects.test(roomid)) return null;
		return roomid as RoomID;
	}
	posStyle(pos: PanelPosition) {
		if (!pos) return {display: 'none'};

		let top: number | null = (pos.top || 0);
		let height: number | null = null;
		let bottom: number | null = (pos.bottom || 0);
		if (bottom > 0 || top < 0) {
			height = bottom - top;
			if (height < 0) throw new RangeError("Invalid pos range");
			if (top < 0) top = null;
			else bottom = null;
		}

		let left: number | null = (pos.left || 0);
		let width: number | null = null;
		let right: number | null = (pos.right || 0);
		if (right > 0 || left < 0) {
			width = right - left - 1;
			if (width < 0) throw new RangeError("Invalid pos range");
			if (left < 0) left = null;
			else right = null;
		}

		return {
			display: 'block',
			top: top === null ? `auto` : `${top}px`,
			height: height === null ? `auto` : `${height}px`,
			bottom: bottom === null ? `auto` : `${-bottom}px`,
			left: left === null ? `auto` : `${left}px`,
			width: width === null ? `auto` : `${width}px`,
			right: right === null ? `auto` : `${-right}px`,
		};
	}
	renderRoom(room: PSRoom) {
		let pos = null;
		if (PS.leftRoomWidth === 0) {
			// one panel visible
			if (room === PS.room) pos = {top: 56};
		} else {
			// both panels visible
			if (room === PS.leftRoom) pos = {top: 56, right: PS.leftRoomWidth};
			if (room === PS.rightRoom) pos = {top: 56, left: PS.leftRoomWidth};
		}
		const roomType = PS.roomTypes[room.type];
		const Panel = roomType ? roomType.Component : PSRoomPanel;
		return <Panel key={room.id} style={this.posStyle(pos)} room={room} />;
	}
	renderPopup(room: PSRoom) {
		const roomType = PS.roomTypes[room.type];
		const Panel = roomType ? roomType.Component : PSRoomPanel;
		return <div class="ps-overlay">
			<Panel key={room.id} style={{maxWidth: 480}} room={room} />
		</div>;
	}
	render() {
		let rooms = [] as preact.VNode[];
		for (const roomid in PS.rooms) {
			const room = PS.rooms[roomid]!;
			if (room.side !== 'popup') {
				rooms.push(this.renderRoom(room));
			}
		}
		return <div class="ps-frame">
			<PSHeader style={this.posStyle({bottom: 50})} />
			{rooms}
			{PS.popups.map(roomid => this.renderPopup(PS.rooms[roomid]!))}
		</div>;
	}
}

type PanelPosition = {top?: number, bottom?: number, left?: number, right?: number} | null;

preact.render(<PSMain />, document.body, document.getElementById('ps-frame')!);
