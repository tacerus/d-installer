/*
 * Copyright (c) [2022] SUSE LLC
 *
 * All Rights Reserved.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of version 2 of the GNU General Public License as published
 * by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, contact SUSE LLC.
 *
 * To contact SUSE LLC about this file by physical or electronic mail, you may
 * find current contact information at www.suse.com.
 */

import React, { useState, useEffect } from "react";
import { useInstallerClient } from "./context/installer";

import Overview from "./Overview";
import InstallationProgress from "./InstallationProgress";

function Installer() {
  const client = useInstallerClient();
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(async () => {
    const status = await client.getStatus();
    setIsInstalling(status !== 0);
  }, []);

  useEffect(() => {
    return client.onSignal("StatusChanged", (_path, _iface, _signal, args) => {
      setIsInstalling(args[0] !== 0);
    });
  }, []);

  return isInstalling ? <InstallationProgress /> : <Overview />;
}

export default Installer;
