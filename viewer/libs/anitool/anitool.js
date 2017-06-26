
(function(window,document,Laya){
	var __un=Laya.un,__uns=Laya.uns,__static=Laya.static,__class=Laya.class,__getset=Laya.getset,__newvec=Laya.__newvec;

	var AnimationTemplet=laya.ani.AnimationTemplet,Browser=laya.utils.Browser,Byte=laya.utils.Byte,Event=laya.events.Event;
	var EventDispatcher=laya.events.EventDispatcher,Handler=laya.utils.Handler,Loader=laya.net.Loader,Matrix=laya.maths.Matrix;
	var Point=laya.maths.Point,Sprite=laya.display.Sprite,Templet=laya.ani.bone.Templet,Texture=laya.resource.Texture;
	var WebGL=laya.webgl.WebGL;
	/**
	*...
	*@author ...
	*/
	//class dragonBones.Armature
	var Armature=(function(){
		function Armature(){
			this.boneRoot=null;
			this._currAnimationData=null;
			this._timeLineLength=0;
			this.display=null;
			this.armatureData=null;
			this.scale=1;
			this.offsetX=0;
			this.offsetY=0;
			this.enableCache=false;
			this._interpolationTransform=new DBTransform();
		}

		__class(Armature,'dragonBones.Armature');
		var __proto=Armature.prototype;
		__proto.update=function(x,y,scale){
			var tMatrix=new Matrix();
			tMatrix.a=tMatrix.d=scale;
			tMatrix.tx=x;
			tMatrix.ty=y;
			this.boneRoot.update(tMatrix);
		}

		__proto.advanceTime=function(time){
			time=time % this._timeLineLength;
			console.log("time:"+time.toString());
			if (this.enableCache){
				return;
			};
			var tAni=this._currAnimationData;
			if (tAni){
				var tAniBoneData;
				for (var i=0;i < tAni.boneArr.length;i++){
					tAniBoneData=tAni.boneArr[i];
					var tBone=this.boneRoot.findBone(tAniBoneData.name);
					if (tBone){
						var tTime=time;
						var tTimeA=0;
						var tNextFrameIndex=0;
						var tFrameIndex=0;
						for (var j=0;j < tAniBoneData.frameArr.length;j++){
							var tBoneFrame=tAniBoneData.frameArr[j];
							tTime-=tBoneFrame.duration;
							if (tTime < 0){
								tTime+=tBoneFrame.duration
								tTimeA=tTime / tBoneFrame.duration;
								tNextFrameIndex=j+1;
								if (tNextFrameIndex > (tAniBoneData.frameArr.length-1)){
									tNextFrameIndex=tAniBoneData.frameArr.length-1;
								}
								tFrameIndex=j;
								break ;
							}
						}
						this.interpolation(tAniBoneData.frameArr[tFrameIndex].transform,tAniBoneData.frameArr[tNextFrameIndex].transform,tTimeA,this._interpolationTransform);
						tBone.setMatrix(this._interpolationTransform.getMatrix());
					}
				}
			}
			this.update(this.offsetX,this.offsetY,this.scale);
			if (this.enableCache){
				var tArray=[];
				this.boneRoot.getMatrixArray(tArray);
			}
		}

		//两个插值
		__proto.interpolation=function(transA,transB,inter,transform){
			var invInter=1-inter;
			transform.scX=transB.scX *inter+transA.scX *invInter;
			transform.scY=transB.scY *inter+transA.scY *invInter;
			transform.skX=transB.skX *inter+transA.skX *invInter;
			transform.skY=transB.skY *inter+transA.skY *invInter;
			transform.x=transB.x *inter+transA.x *invInter;
			transform.y=transB.y *inter+transA.y *invInter;
		}

		__proto.gotoAndPlay=function(actionName){
			if (this.armatureData==null)return;
			this._currAnimationData=this.armatureData.animationDic[actionName];
			if (this._currAnimationData){
				this._timeLineLength=this._currAnimationData.duration;
				console.log(actionName+":"+this._timeLineLength.toString());
			}
		}

		/**缓存动画的思路：对时间(S)进行分帧，然后动作的每帧的最终矩阵数据保存起来，然后再复用最终的矩阵生成graphics*/
		__proto.enableAnimationCache=function(frameRate){}
		return Armature;
	})()


	//class Tools
	var Tools=(function(){
		function Tools(){
			this.mFactoryType=0;
		}

		__class(Tools,'Tools');
		var __proto=Tools.prototype;
		__proto.testLoaderFile=function(type,name,path,dbTools,completeFun,failFun){}
		__proto.getObjectBuffer=function(obj){
			var i=0,j=0,k=0,l=0,n=0;
			var bytes=new Byte();
			bytes.endian="littleEndian";
			bytes.writeUTFString(obj.versionIdentifier);
			bytes.writeUTFString(obj.aniClassName);
			var kkk=0;
			var stringArea="";
			for (i=0;i < obj.animationDatas.length;i++){
				for (j=0;j < obj.animationDatas[i].animationNodeDatas.length;j++){
					stringArea+=obj.animationDatas[i].animationNodeDatas[j].name;
					stringArea+="\n";
					kkk++;
				}
				(i==obj.animationDatas.length-1)?stringArea+=obj.animationDatas[i].name:stringArea+=obj.animationDatas[i].name+"\n";
			}
			bytes.writeUTFString(stringArea);
			var animationNum=obj.animationDatas.length;
			bytes.writeUint8(animationNum);
			var pospublicDataAddr=bytes.pos;
			bytes.writeUint32(0);
			var posexternalDataAddr=bytes.pos;
			bytes.writeUint32(posexternalDataAddr);
			var tBoneNum=0;
			var tLastBoneNum=0;
			var poslocalAnimationData=bytes.pos;
			bytes.writeUint8(0);
			var keyframeParamsOffset=0;
			for (i=0;i < animationNum;i++){
				tLastBoneNum=tBoneNum;
				tBoneNum+=obj.animationDatas[i].animationNodeDatas.length;
				bytes.writeUint16(tBoneNum);
				tBoneNum++;
				bytes.writeFloat32(obj.animationDatas[i].duration);
				var boneCount=obj.animationDatas[i].animationNodeDatas.length;
				bytes.writeUint8(boneCount);
				for (j=0;j < boneCount;j++){
					bytes.writeInt16(tLastBoneNum+j);
					var parentIndex=-1;
					if (obj.animationDatas[i].animationNodeDatas[j].parent !=null){
						for (var jj=0;jj < obj.animationDatas[i].animationNodeDatas.length;jj++){
							if (obj.animationDatas[i].animationNodeDatas[j].parent.name==
								obj.animationDatas[i].animationNodeDatas[jj].name){
								parentIndex=jj;
								break ;
							}
						};
						var animationNodeData=obj.animationDatas[i].animationNodeDatas[j].parent;
					}
					bytes.writeInt16(parentIndex);
					var bIsUseLerp=0;
					bIsUseLerp=obj.animationDatas[i].animationNodeDatas[j].lerpType;
					bytes.writeUint8(bIsUseLerp);
					bytes.writeUint32(keyframeParamsOffset);
					keyframeParamsOffset+=(obj.animationDatas[i].animationNodeDatas[j].keyFrameLerpTypes.length+2);
					var privateDataLen=obj.animationDatas[i].animationNodeDatas[j].privateData.length;
					bytes.writeUint16(privateDataLen);
					for (k=0;k < privateDataLen;k++)
					bytes.writeByte(obj.animationDatas[i].animationNodeDatas[j].privateData[k]);
					var keyframeCount=obj.animationDatas[i].animationNodeDatas[j].keyFrameDatas.length;
					bytes.writeUint16(keyframeCount);
					for (k=0;k < obj.animationDatas[i].animationNodeDatas[j].keyFrameDatas.length;k++){
						bytes.writeFloat32(obj.animationDatas[i].animationNodeDatas[j].keyFrameDatas[k].time);
						if (bIsUseLerp==2){
							var tlerpData=obj.animationDatas[i].animationNodeDatas[j].keyFrameDatas[k].interpolationData;
							bytes.writeUint8(tlerpData.length);
							for (l=0;l < tlerpData.length;l++){
								bytes.writeFloat32(tlerpData[l]);
							}
						}
						for (l=0;l < obj.animationDatas[i].animationNodeDatas[j].keyFrameDatas[k].data.length;l++){
							bytes.writeFloat32(obj.animationDatas[i].animationNodeDatas[j].keyFrameDatas[k].data[l]);
						}
					}
				}
			};
			var nPublicAddr=bytes.pos;
			var tKeyFrameWidth=0;
			for (i=0;i < obj.animationDatas.length;i++){
				if (obj.animationDatas[i].animationNodeDatas.length > 0){
					if (obj.animationDatas[i].animationNodeDatas.length > 0){
						for (j=0;j < obj.animationDatas[i].animationNodeDatas.length;j++){
							tKeyFrameWidth=obj.animationDatas[i].animationNodeDatas[j].keyFrameWidth;
							bytes.writeUint16(tKeyFrameWidth);
							var tDataArray=obj.animationDatas[i].animationNodeDatas[j].keyFrameLerpTypes;
							for (k=0;k < tDataArray.length;k++){
								bytes.writeUint8(tDataArray[k]);
							}
						}
						}else {
						bytes.writeInt16(0);
					}
				}
				else{
					bytes.writeUint16(0);
				}
			};
			var nExternalAddr=bytes.pos;
			var tTextureData;
			var tTextureDataArray=obj.extenData.textureData;
			if (tTextureDataArray){
				bytes.writeInt32(tTextureDataArray.length);
				var tTextureNameStr="";
				if (tTextureDataArray.length > 0){
					for (i=0,n=tTextureDataArray.length;i < n;i++){
						tTextureData=tTextureDataArray[i];
						tTextureNameStr+=tTextureData.textureSrc+"\n";
						tTextureNameStr+=tTextureData.name+"\n";
					}
				}
				tTextureNameStr.substr(0,tTextureNameStr.length-2);
				bytes.writeUTFString(tTextureNameStr);
				for (i=0,n=tTextureDataArray.length;i < n;i++){
					tTextureData=tTextureDataArray[i];
					bytes.writeFloat32(tTextureData.x);
					bytes.writeFloat32(tTextureData.y);
					bytes.writeFloat32(tTextureData.w);
					bytes.writeFloat32(tTextureData.h);
					bytes.writeFloat32(tTextureData.frameX);
					bytes.writeFloat32(tTextureData.frameY);
					bytes.writeFloat32(tTextureData.frameW);
					bytes.writeFloat32(tTextureData.frameH);
				}
				}else {
				bytes.writeUint8(0);
			};
			var tAnimationData;
			bytes.writeUint16(obj.animationDatas.length);
			for (i=0;i < obj.animationDatas.length;i++){
				tAnimationData=obj.animationDatas[i];
				bytes.writeUint16(tAnimationData.boneLen);
				bytes.writeUint16(tAnimationData.slotLen);
				bytes.writeUint16(tAnimationData.ikLen);
				bytes.writeUint16(tAnimationData.pathLen);
			};
			var tDBBoneData;
			var tBoneArr=obj.extenData.boneArr;
			bytes.writeInt16(tBoneArr.length);
			for (i=0;i < tBoneArr.length;i++){
				tDBBoneData=tBoneArr[i];
				bytes.writeUTFString(tDBBoneData.name);
				bytes.writeUTFString(tDBBoneData.parent);
				bytes.writeFloat32(tDBBoneData.length);
				if (tDBBoneData.inheritRotation){
					bytes.writeByte(0);
					}else {
					bytes.writeByte(1);
				}
				if (tDBBoneData.inheritScale){
					bytes.writeByte(0);
					}else {
					bytes.writeByte(1);
				}
			};
			var tMatrixDataLen=obj.extenData.matrixDataLen;
			var tLen=obj.extenData.srcBoneMatrixLength;
			var tBoneMatrixArr=obj.extenData.srcBoneMatrix;
			bytes.writeUint16(tMatrixDataLen);
			bytes.writeUint16(tLen);
			for (i=0;i < tLen;i++){
				bytes.writeFloat32(tBoneMatrixArr[i]);
			};
			var tIkConstraintData;
			var tIkArr=obj.extenData.ikArr;
			bytes.writeUint16(tIkArr.length);
			for (i=0;i < tIkArr.length;i++){
				tIkConstraintData=tIkArr[i];
				bytes.writeUint16(tIkConstraintData.boneNames.length);
				for (j=0;j < tIkConstraintData.boneNames.length;j++){
					bytes.writeUTFString(tIkConstraintData.boneNames[j]);
					bytes.writeInt16(tIkConstraintData.boneIndexs[j]);
				}
				bytes.writeUTFString(tIkConstraintData.name);
				bytes.writeUTFString(tIkConstraintData.targetBoneName);
				bytes.writeInt16(tIkConstraintData.targetBoneIndex);
				bytes.writeFloat32(tIkConstraintData.bendDirection);
				bytes.writeFloat32(tIkConstraintData.mix);
			};
			var tTransformConstraintData;
			var tTransArr=obj.extenData.transData;
			bytes.writeUint16(tTransArr.length);
			for (i=0;i < tTransArr.length;i++){
				tTransformConstraintData=tTransArr[i];
				bytes.writeUint16(tTransformConstraintData.boneIndexs.length);
				for (j=0;j < tTransformConstraintData.boneIndexs.length;j++){
					bytes.writeInt16(tTransformConstraintData.boneIndexs[j]);
				}
				bytes.writeUTFString(tTransformConstraintData.name);
				bytes.writeUint16(tTransformConstraintData.target);
				bytes.writeFloat32(tTransformConstraintData.rotateMix);
				bytes.writeFloat32(tTransformConstraintData.translateMix);
				bytes.writeFloat32(tTransformConstraintData.scaleMix);
				bytes.writeFloat32(tTransformConstraintData.shearMix);
				bytes.writeFloat32(tTransformConstraintData.offsetRotation);
				bytes.writeFloat32(tTransformConstraintData.offsetX);
				bytes.writeFloat32(tTransformConstraintData.offsetY);
				bytes.writeFloat32(tTransformConstraintData.offsetScaleX);
				bytes.writeFloat32(tTransformConstraintData.offsetScaleY);
				bytes.writeFloat32(tTransformConstraintData.offsetShearY);
			};
			var tPathConstraintData;
			var tPathArr=obj.extenData.pathArr;
			bytes.writeUint16(tPathArr.length);
			for (i=0;i < tPathArr.length;i++){
				tPathConstraintData=tPathArr[i];
				bytes.writeUTFString(tPathConstraintData.name);
				bytes.writeUint16(tPathConstraintData.bones.length);
				for (j=0;j < tPathConstraintData.bones.length;j++){
					bytes.writeInt16(tPathConstraintData.boneIds[j]);
				}
				bytes.writeUTFString(tPathConstraintData.target);
				bytes.writeUTFString(tPathConstraintData.positionMode);
				bytes.writeUTFString(tPathConstraintData.spacingMode);
				bytes.writeUTFString(tPathConstraintData.rotateMode);
				bytes.writeFloat32(tPathConstraintData.offsetRotation);
				bytes.writeFloat32(tPathConstraintData.position);
				bytes.writeFloat32(tPathConstraintData.spacing);
				bytes.writeFloat32(tPathConstraintData.rotateMix);
				bytes.writeFloat32(tPathConstraintData.translateMix);
			};
			var tSkinAniList;
			var tSkinAni;
			var tDeformSlotAni;
			var tDeformSlotDisplayAni;
			var tDeformAniArr=obj.extenData.deformAniData;
			var tDeformVertices;
			bytes.writeInt16(tDeformAniArr.length);
			for (i=0;i < tDeformAniArr.length;i++){
				tSkinAniList=tDeformAniArr[i];
				bytes.writeUint8(tSkinAniList.length);
				for (var f=0;f < tSkinAniList.length;f++){
					tSkinAni=tSkinAniList[f];
					if (!tSkinAni){
						tSkinAni=new DeformSkinAni();
					}
					bytes.writeUTFString(tSkinAni.name);
					bytes.writeInt16(tSkinAni.deformSlotArray.length);
					for (j=0;j < tSkinAni.deformSlotArray.length;j++){
						tDeformSlotAni=tSkinAni.deformSlotArray[j];
						bytes.writeInt16(tDeformSlotAni.mDisplayArray.length);
						for (k=0;k < tDeformSlotAni.mDisplayArray.length;k++){
							tDeformSlotDisplayAni=tDeformSlotAni.mDisplayArray[k];
							bytes.writeInt16(tDeformSlotDisplayAni.slotIndex);
							bytes.writeUTFString(tDeformSlotDisplayAni.attachment);
							bytes.writeInt16(tDeformSlotDisplayAni.timeList.length);
							for (l=0;l < tDeformSlotDisplayAni.timeList.length;l++){
								if (tDeformSlotDisplayAni.tweenKeyList[l]){
									bytes.writeByte(1);
									}else {
									bytes.writeByte(0);
								}
								bytes.writeFloat32(tDeformSlotDisplayAni.timeList[l]);
								tDeformVertices=tDeformSlotDisplayAni.vectices[l];
								bytes.writeInt16(tDeformVertices.length);
								for (n=0;n < tDeformVertices.length;n++){
									bytes.writeFloat32(tDeformVertices[n]);
								}
							}
						}
					}
				}
			};
			var tDoAniData;
			var tDOArr;
			var tDOAniDAtaArr=obj.extenData.drawOrderAniData;
			bytes.writeInt16(tDOAniDAtaArr.length);
			for (i=0;i < tDOAniDAtaArr.length;i++){
				tDOArr=tDOAniDAtaArr[i];
				bytes.writeInt16(tDOArr.length);
				for (j=0;j < tDOArr.length;j++){
					tDoAniData=tDOArr[j];
					bytes.writeFloat32(tDoAniData.time);
					bytes.writeInt16(tDoAniData.orderArr.length);
					for (k=0;k < tDoAniData.orderArr.length;k++){
						bytes.writeInt16(tDoAniData.orderArr[k]);
					}
				}
			};
			var tEventData;
			var tEventArr;
			var tEventAniArr=obj.extenData.eventAniData;
			bytes.writeInt16(tEventAniArr.length);
			for (i=0;i < tEventAniArr.length;i++){
				tEventArr=tEventAniArr[i];
				bytes.writeInt16(tEventArr.length);
				for (j=0;j < tEventArr.length;j++){
					tEventData=tEventArr[j];
					bytes.writeUTFString(tEventData.name);
					bytes.writeInt32(tEventData.intValue);
					bytes.writeFloat32(tEventData.floatValue);
					bytes.writeUTFString(tEventData.stringValue);
					bytes.writeFloat32(tEventData.time);
				}
			};
			var tAttachName;
			var tAttachNames=obj.extenData.attachments;
			bytes.writeInt16(tAttachNames.length);
			for (i=0;i < tAttachNames.length;i++){
				tAttachName=tAttachNames[i];
				bytes.writeUTFString(tAttachName);
			};
			var tBoneSlotData;
			var tBoneSlotArr=obj.extenData.BoneSlotArr;
			bytes.writeInt16(tBoneSlotArr.length);
			for (i=0;i < tBoneSlotArr.length;i++){
				tBoneSlotData=tBoneSlotArr[i];
				if (tBoneSlotData){
					bytes.writeUTFString(tBoneSlotData.name);
					bytes.writeUTFString(tBoneSlotData.parent);
					bytes.writeUTFString(tBoneSlotData.attachmentName);
					bytes.writeInt16(tBoneSlotData.displayIndex);
				}
			};
			var tSkinData;
			var tSlotData;
			var tDisplayData;
			var tSkinDataArr=obj.extenData.SkinArr;
			var tString="";
			for (i=0;i < tSkinDataArr.length;i++){
				tSkinData=tSkinDataArr[i];
				tString+=tSkinData.name+"\n";
				for (j=0;j < tSkinData.slotArr.length;j++){
					tSlotData=tSkinData.slotArr[j];
					tString+=tSlotData.name+"\n";
					for (k=0;k < tSlotData.displayArr.length;k++){
						tDisplayData=tSlotData.displayArr[k];
						tString+=tDisplayData.name+"\n";
						tString+=tDisplayData.attachmentName+"\n";
					}
				}
			}
			tString.substr(0,tString.length-2);
			bytes.writeUTFString(tString);
			bytes.writeUint8(tSkinDataArr.length);
			for (i=0;i < tSkinDataArr.length;i++){
				tSkinData=tSkinDataArr[i];
				bytes.writeUint8(tSkinData.slotArr.length);
				for (j=0;j < tSkinData.slotArr.length;j++){
					tSlotData=tSkinData.slotArr[j];
					bytes.writeUint8(tSlotData.displayArr.length);
					for (k=0;k < tSlotData.displayArr.length;k++){
						tDisplayData=tSlotData.displayArr[k];
						bytes.writeFloat32(tDisplayData.transform.scX);
						bytes.writeFloat32(tDisplayData.transform.skX);
						bytes.writeFloat32(tDisplayData.transform.skY);
						bytes.writeFloat32(tDisplayData.transform.scY);
						bytes.writeFloat32(tDisplayData.transform.x);
						bytes.writeFloat32(tDisplayData.transform.y);
						bytes.writeFloat32(tDisplayData.width);
						bytes.writeFloat32(tDisplayData.height);
						bytes.writeUint8(tDisplayData.type);
						bytes.writeUint16(tDisplayData.vertexLen);
						switch(tDisplayData.type){
							case 0:
							case 1:
							case 2:
							case 3:;
								var tBonePose=tDisplayData.bonePose;
								bytes.writeUint16(tBonePose.length);
								for (l=0;l < tBonePose.length;l++){
									bytes.writeUint16(tBonePose[l]);
								};
								var tUvs=tDisplayData.uvs;
								bytes.writeUint16(tUvs.length);
								for (l=0;l < tUvs.length;l++){
									bytes.writeFloat32(tUvs[l]);
								};
								var tWeights=tDisplayData.weights;
								bytes.writeUint16(tWeights.length);
								for (l=0;l < tWeights.length;l++){
									bytes.writeFloat32(tWeights[l]);
								};
								var tTriangles=tDisplayData.triangles;
								bytes.writeUint16(tTriangles.length);
								for (l=0;l < tTriangles.length;l++){
									bytes.writeUint16(tTriangles[l]);
								};
								var tVertices=tDisplayData.vertices;
								bytes.writeUint16(tVertices.length);
								for (l=0;l < tVertices.length;l++){
									bytes.writeFloat32(tVertices[l]);
								};
								var tLenghts=tDisplayData.lengths;
								bytes.writeUint16(tLenghts.length);
								for (l=0;l < tLenghts.length;l++){
									bytes.writeFloat32(tLenghts[l]);
								}
								break ;
							}
					}
				}
			}
			bytes.writeUint8(this.mFactoryType);
			bytes.pos=pospublicDataAddr;
			bytes.writeUint32(nPublicAddr);
			bytes.pos=posexternalDataAddr;
			bytes.writeUint32(nExternalAddr);
			bytes.pos=0;
			return bytes.buffer;
		}

		__proto.save=function(filename,dataView){}
		return Tools;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBAniBoneData
	var DBAniBoneData=(function(){
		function DBAniBoneData(){
			this.name=null;
			this.scale=1.0;
			this.offset=0;
			this.frameArr=[];
		}

		__class(DBAniBoneData,'dragonBones.DBAniBoneData');
		var __proto=DBAniBoneData.prototype;
		__proto.initData=function(data,armatureData){
			this.name=data.name;
			this.scale=data.scale;
			this.offset=data.offset;
			var tAnimBoneFrame;
			var tFrameData;
			var i=0;
			var n=0;
			var tFrameDataArr=data.frame;
			var tTime=0;
			var hasSkew=false;
			for (i=0,n=tFrameDataArr.length;i < n;i++){
				tFrameData=tFrameDataArr[i];
				tAnimBoneFrame=new DBAniBoneFrameData();
				tAnimBoneFrame.initData(tFrameData);
				hasSkew=hasSkew || tAnimBoneFrame.hasSkew();
				tAnimBoneFrame.time=tTime;
				tTime+=tAnimBoneFrame.duration *armatureData.onFrameTime;
				this.frameArr.push(tAnimBoneFrame);
			}
			if (hasSkew){
				this.checkSkew();
			}
			else {
				this.checkAngleNew();
			}
		}

		__proto.checkSkew=function(){
			var tAnimBoneFrame;
			if (this.frameArr.length > 0){
				DBAniBoneData.dealRotations(this.frameArr,"skewX");
				DBAniBoneData.dealRotations(this.frameArr,"skewY");
			}
		}

		__proto.checkAngleNew=function(){
			var tAnimBoneFrame;
			if (this.frameArr.length > 0){
				tAnimBoneFrame=this.frameArr[0];
				var tLastAngle=tAnimBoneFrame.transform.skY;
				var tCurrAngle=0;
				var tAngle=0;
				var tAbsAngle=0;
				var tResultAngle=tLastAngle;
				var preRote=tAnimBoneFrame.tweenRotate;
				var tD=NaN;
				for (var i=1,n=this.frameArr.length;i < n;i++){
					tAnimBoneFrame=this.frameArr[i];
					tCurrAngle=tAnimBoneFrame.transform.skY;
					tAngle=tCurrAngle-tResultAngle;
					while (tAngle > 180){
						tAngle-=360;
					}
					while (tAngle <-180){
						tAngle+=360;
					}
					if (preRote !=0&&preRote!=undefined){
						if (preRote > 0){
							if (tAngle > 0){
								tAngle=preRote *360+tAngle;
							}
							else {
								tAngle=preRote *360+tAngle+360;
							}
						}
						else {
							if (tAngle < 0){
								tAngle=preRote *360+tAngle;
							}
							else {
								tAngle=preRote *360+tAngle-360;
							}
						}
					}
					else {}
					tResultAngle+=tAngle;
					tLastAngle=tCurrAngle;
					tAnimBoneFrame.transform.skX=tAnimBoneFrame.transform.skY=tResultAngle;
					preRote=tAnimBoneFrame.tweenRotate;
				}
			}
		}

		__proto.checkAngle=function(){
			var tAnimBoneFrame;
			if (this.frameArr.length > 0){
				tAnimBoneFrame=this.frameArr[0];
				var tLastAngle=tAnimBoneFrame.transform.skY;
				var tCurrAngle=0;
				var tAngle=0;
				var tAbsAngle=0;
				var tResultAngle=tLastAngle;
				for (var i=1,n=this.frameArr.length;i < n;i++){
					tAnimBoneFrame=this.frameArr[i];
					tCurrAngle=tAnimBoneFrame.transform.skY;
					tAngle=tCurrAngle-tLastAngle;
					tAbsAngle=Math.abs(tAngle);
					if (tAbsAngle > 180){
						if (tAngle > 0){
							tAngle=tAngle-360;
						}
						else {
							tAngle=360+tAngle;
						}
					}
					tResultAngle+=tAngle;
					tLastAngle=tCurrAngle;
					tAnimBoneFrame.transform.skX=tAnimBoneFrame.transform.skY=tResultAngle;
				}
			}
		}

		DBAniBoneData.dealRotations=function(frames,sign){
			(sign===void 0)&& (sign="skewX");
			var i=0,len=0;
			len=frames.length;
			var preAngle=0;
			var tAngle=NaN;
			var tFrame;
			var tD=NaN;
			for (i=0;i < len;i++){
				tFrame=frames[i];
				tAngle=tFrame.transform[sign];
				tD=tAngle-preAngle;
				while (tD > 180){
					tD-=360;
				}
				while (tD <-180){
					tD+=360;
				}
				tAngle=preAngle+tD;
				tFrame.transform[sign]=tAngle;
				preAngle=tAngle;
			}
		}

		return DBAniBoneData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBAniBoneFrameData
	var DBAniBoneFrameData=(function(){
		function DBAniBoneFrameData(){
			this.duration=1;
			this.tweenEasing=0;
			this.curve=[];
			this.event=null;
			this.sound=null;
			this.tweenRotate=0;
			this.transform=null;
			this.time=0;
		}

		__class(DBAniBoneFrameData,'dragonBones.DBAniBoneFrameData');
		var __proto=DBAniBoneFrameData.prototype;
		__proto.hasSkew=function(){
			if (this.transform.skewX !=0)return true;
			if (this.transform.skewY !=0)return true;
			return false;
		}

		__proto.initData=function(data){
			this.duration=data.duration;
			this.tweenEasing=data.tweenEasing;
			this.curve=data.curve;
			this.event=data.event;
			this.sound=data.sound;
			this.tweenRotate=data.tweenRotate;
			var tTransform=new DBTransform();
			tTransform.initData(data.transform);
			tTransform.setLerp(this.tweenEasing,this.curve);
			this.transform=tTransform;
		}

		__proto.copy=function(){
			var tDBAniBoneFrameData=new DBAniBoneFrameData();
			tDBAniBoneFrameData.duration=this.duration;
			tDBAniBoneFrameData.tweenEasing=this.tweenEasing;
			tDBAniBoneFrameData.curve=this.curve;
			tDBAniBoneFrameData.event=this.event;
			tDBAniBoneFrameData.sound=this.sound;
			tDBAniBoneFrameData.transform=this.transform;
			tDBAniBoneFrameData.time=this.time;
			return tDBAniBoneFrameData;
		}

		return DBAniBoneFrameData;
	})()


	/**
	*...
	*@author
	*/
	//class dragonBones.DBAniFfdData
	var DBAniFfdData=(function(){
		function DBAniFfdData(){
			this.name=null;
			this.skin=null;
			this.slot=null;
			this.frame=[];
		}

		__class(DBAniFfdData,'dragonBones.DBAniFfdData');
		var __proto=DBAniFfdData.prototype;
		__proto.init=function(data){
			this.name=data.name;
			var tFfdFrameData;
			var tFrameData;
			var tFrameDataArr=data.frame;
			for (var i=0;i < tFrameDataArr.length;i++){
				tFfdFrameData=new DBAniFfdFrameData();
				this.frame.push(tFfdFrameData);
				tFrameData=tFrameDataArr[i];
				tFfdFrameData.duration=tFrameData.duration;
				tFfdFrameData.tweenEasing=tFrameData.tweenEasing;
				var tCurveArr=tFrameData.curve;
				if (tCurveArr){
					for (var j=0;j < tCurveArr.length;j++){
						tFfdFrameData.curve.push(tCurveArr[j]);
					}
				}
				tFfdFrameData.offset=tFrameData.offset;
				var tVertices=tFrameData.vertices;
				if (tVertices){
					for (j=0;j < tVertices.length;j++){
						tFfdFrameData.vertices.push(tVertices[j]);
					}
				}
			}
		}

		return DBAniFfdData;
	})()


	/**
	*...
	*@author
	*/
	//class dragonBones.DBAniFfdFrameData
	var DBAniFfdFrameData=(function(){
		function DBAniFfdFrameData(){
			this.duration=NaN;
			this.tweenEasing=NaN;
			this.curve=[];
			this.offset=0;
			this.vertices=[];
			this.tweens=[];
		}

		__class(DBAniFfdFrameData,'dragonBones.DBAniFfdFrameData');
		return DBAniFfdFrameData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBAnimationData
	var DBAnimationData=(function(){
		var MergeFrameData;
		function DBAnimationData(){
			this.name=null;
			this.playTimes=0;
			this.duration=1;
			this.frameArr=[];
			this.boneArr=[];
			this.slotArr=[];
			this.ikArr=[];
			this.pathArr=[];
			this.drawOrderArr=[];
			this.eventArr=[];
			this.ffdArr=[];
			this.deformSkinAniList=new Array;
		}

		__class(DBAnimationData,'dragonBones.DBAnimationData');
		var __proto=DBAnimationData.prototype;
		__proto.initData=function(data,armatureData){
			this.name=data.name;
			this.playTimes=data.playTimes;
			this.duration=data.duration;
			var i=0;
			var tDBFrameData;
			var tFrameData;
			var tFrameArr=data.frame;
			var tTime=0;
			for (i=0;i < tFrameArr.length;i++){
				tFrameData=tFrameArr[i];
				tDBFrameData=new DBFrameData();
				tDBFrameData.duration=tFrameData.duration;
				tDBFrameData.time=tTime;
				tTime+=tDBFrameData.duration *armatureData.onFrameTime;
				tDBFrameData.event=tFrameData.event;
				tDBFrameData.sound=tFrameData.sound;
				this.frameArr.push(tDBFrameData);
			};
			var tAniBone;
			var tBone;
			var tBoneArr=data.bone;
			for (i=0;i < tBoneArr.length;i++){
				tBone=tBoneArr[i];
				tAniBone=new DBAniBoneData();
				tAniBone.initData(tBone,armatureData);
				this.boneArr.push(tAniBone);
			};
			var tAniSlotData;
			var tSlotData;
			var tSlotDataArr=data.slot;
			for (i=0;i < tSlotDataArr.length;i++){
				tSlotData=tSlotDataArr[i];
				tAniSlotData=new DBAniSlotData();
				tAniSlotData.initData(tSlotData);
				this.slotArr.push(tAniSlotData);
			};
			var tMergeFrameData=new MergeFrameData();
			for (i=0;i < this.frameArr.length;i++){
				tMergeFrameData.insertData(this.frameArr[i]);
			};
			var tAnimBoneFrame;
			for (i=0;i < this.boneArr.length;i++){
				tAniBone=this.boneArr[i];
				for (var j=0;j < tAniBone.frameArr.length;j++){
					tAnimBoneFrame=tAniBone.frameArr[j];
					if (tAnimBoneFrame.event){
						tDBFrameData=new DBFrameData();
						tDBFrameData.event=tAnimBoneFrame.event;
						tDBFrameData.sound=tAnimBoneFrame.sound;
						tDBFrameData.time=tAnimBoneFrame.time;
						tMergeFrameData.insertData(tDBFrameData);
					}
				}
			};
			var tEventData;
			for (i=0;i < tMergeFrameData.mFrameDataList.length;i++){
				tDBFrameData=tMergeFrameData.mFrameDataList[i];
				tEventData=new EventData();
				tEventData.name=tDBFrameData.event;
				tEventData.time=tDBFrameData.time;
				this.eventArr.push(tEventData);
			}
		}

		DBAnimationData.__init$=function(){
			//class MergeFrameData
			MergeFrameData=(function(){
				function MergeFrameData(){
					this.mMaxTime=0;
					this.mFrameDataList=[];
				}
				__class(MergeFrameData,'');
				var __proto=MergeFrameData.prototype;
				__proto.insertData=function(data){
					if (this.mFrameDataList.length==0 || data.time >=this.mMaxTime){
						this.mMaxTime=data.time;
						this.mFrameDataList.push(data);
						return;
					};
					var tFrameData;
					for (var i=0;i < this.mFrameDataList.length;i++){
						tFrameData=this.mFrameDataList[i];
						if (data.time < tFrameData.time){
							this.mFrameDataList.splice(i,0,data);
							break ;
						}
					}
				}
				return MergeFrameData;
			})()
		}

		return DBAnimationData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBAniSlotData
	var DBAniSlotData=(function(){
		function DBAniSlotData(){
			this.name=null;
			this.frameArr=[];
		}

		__class(DBAniSlotData,'dragonBones.DBAniSlotData');
		var __proto=DBAniSlotData.prototype;
		__proto.initData=function(data){
			this.name=data.name;
			var tFrameData;
			var tFrameDataArr;
			tFrameDataArr=data.frame;
			for (var i=0;i < tFrameDataArr.length;i++){
				tFrameData=tFrameDataArr[i];
				var tSlotFrameData=new DBAniSlotFrameData();
				tSlotFrameData.initData(tFrameData);
				this.frameArr.push(tSlotFrameData);
			}
		}

		return DBAniSlotData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBAniSlotFrameData
	var DBAniSlotFrameData=(function(){
		function DBAniSlotFrameData(){
			this.duration=1;
			this.tweenEasing=0;
			this.curve=null;
			this.displayIndex=0;
			this.aM=1;
			this.displayIndexKey=false;
			this.aMKey=false;
			this.time=NaN;
		}

		__class(DBAniSlotFrameData,'dragonBones.DBAniSlotFrameData');
		var __proto=DBAniSlotFrameData.prototype;
		__proto.initData=function(data){
			this.duration=data.duration;
			this.tweenEasing=data.tweenEasing;
			this.curve=data.curve;
			if (data.displayIndex){
				this.displayIndex=data.displayIndex;
			}
			if (data.color && data.color.aM !=undefined){
				var tAlpha=data.color.aM;
				if (tAlpha==0){
					tAlpha=1;
				}
				this.aM=tAlpha / 100;
			}
		}

		__proto.getData=function(){
			return [this.displayIndex,this.aM,0,0,0,0];
		}

		__proto.copy=function(){
			var tDBAniSlotFrameData=new DBAniSlotFrameData();
			tDBAniSlotFrameData.duration=this.duration;
			tDBAniSlotFrameData.tweenEasing=this.tweenEasing;
			tDBAniSlotFrameData.curve=this.curve;
			tDBAniSlotFrameData.displayIndex=this.displayIndex;
			tDBAniSlotFrameData.aM=this.aM;
			tDBAniSlotFrameData.time=this.time;
			return tDBAniSlotFrameData;
		}

		return DBAniSlotFrameData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBArmatureData
	var DBArmatureData=(function(){
		function DBArmatureData(){
			this.name=null;
			this.frameRate=0;
			this.type="Armature";
			this.userData=null;
			this.boneArr=[];
			this.slotArr=[];
			this.skinArr=[];
			this.animationDic={};
			this.animationArr=[];
			this.ikArr=[];
			this.transformArr=[];
			this.pathArr=[];
			this.defaultSkin=null;
			this.onFrameTime=1000;
			this.attachmentNames=[];
		}

		__class(DBArmatureData,'dragonBones.DBArmatureData');
		var __proto=DBArmatureData.prototype;
		__proto.getAttachNameIndex=function(name){
			var tAttachmentName;
			for (var i=0;i < this.attachmentNames.length;i++){
				tAttachmentName=this.attachmentNames[i];
				if (tAttachmentName==name){
					return i;
				}
			}
			this.attachmentNames.push(name);
			return this.attachmentNames.length-1;
		}

		__proto.findSlotIndex=function(slotName){
			var tDBSlotData;
			for (var i=0;i < this.slotArr.length;i++){
				tDBSlotData=this.slotArr[i];
				if (tDBSlotData.name==slotName){
					return i;
				}
			}
			return-1;
		}

		__proto.findSkin=function(skinName){
			var tDBSkinData;
			for (var i=0;i < this.skinArr.length;i++){
				tDBSkinData=this.skinArr[i];
				if (tDBSkinData.name==skinName){
					return tDBSkinData;
				}
			}
			return null;
		}

		__proto.findBone=function(bonename){
			var tDBBoneData;
			for (var i=0;i < this.boneArr.length;i++){
				tDBBoneData=this.boneArr[i];
				if (tDBBoneData.name==bonename){
					return tDBBoneData;
				}
			}
			return null;
		}

		__proto.findBoneIndex=function(boneName){
			var tDBBoneData;
			for (var i=0;i < this.boneArr.length;i++){
				tDBBoneData=this.boneArr[i];
				if (tDBBoneData.name==boneName){
					return i;
				}
			}
			return-1;
		}

		return DBArmatureData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBBone
	var DBBone=(function(){
		function DBBone(){
			this.boneName=null;
			this.parent=null;
			this.childArray=null;
			this.matrix=null;
			this.mSlot=null;
			this.mCurrMatrix=new Matrix();
			this.mResultMatrix=new Matrix();
			this.mResultMatrix.identity();
		}

		__class(DBBone,'dragonBones.DBBone');
		var __proto=DBBone.prototype;
		__proto.setData=function(data){
			this.boneName=data.name;
			if (this.boneName=="body"){
				this.matrix=data.getMatrix();
				}else {
				this.matrix=data.getMatrix();
			}
			this.matrix.copyTo(this.mCurrMatrix);
		}

		__proto.setSlot=function(slotData){
			var tSlot=new DBBoneSlot();
			tSlot.slotData=slotData;
			this.mSlot=tSlot;
			return tSlot;
		}

		__proto.setMatrix=function(offsetMatrix){
			Matrix.mul(offsetMatrix,this.matrix,this.mCurrMatrix);
		}

		__proto.findBone=function(name){
			if (name==this.boneName){
				return this;
			}
			if (this.childArray){
				var tMyBone;
				for (var i=0,n=this.childArray.length;i < n;i++){
					tMyBone=this.childArray[i];
					tMyBone=tMyBone.findBone(name);
					if (tMyBone){
						return tMyBone;
					}
				}
			}
			return null;
		}

		__proto.addChild=function(child){
			if (this.childArray==null){
				this.childArray=[];
			}
			this.childArray.push(child);
		}

		__proto.update=function(parentMatrix){
			var tResultMatrix;
			if (parentMatrix){
				Matrix.mul(this.mCurrMatrix,parentMatrix,this.mResultMatrix);
				tResultMatrix=this.mResultMatrix;
				}else {
				tResultMatrix=this.mCurrMatrix;
			}
			if (this.mSlot){
				this.mSlot.setParentMatrix(tResultMatrix);
			}
			if (this.childArray){
				var tMyBone;
				for (var i=0,n=this.childArray.length;i < n;i++){
					tMyBone=this.childArray[i];
					tMyBone.update(tResultMatrix);
				}
			}
		}

		__proto.getMatrixArray=function(matrixArr){
			var tMatrix=new Matrix();
			this.mSlot.transform.copyTo(tMatrix);
			matrixArr.push(tMatrix);
			if (this.childArray !=null){
				var tDBBone;
				for (var i=0;i < this.childArray.length;i++){
					tDBBone=this.childArray[i];
					tDBBone.getMatrixArray(matrixArr);
				}
			}
		}

		return DBBone;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBBoneData
	var DBBoneData=(function(){
		function DBBoneData(){
			this.name=null;
			this.parent=null;
			this.userData=null;
			this.transform=null;
			this.matrix=null;
			this.length=0;
			this.inheritTranslation=true;
			this.inheritScale=true;
			this.inheritRotation=true;
		}

		__class(DBBoneData,'dragonBones.DBBoneData');
		var __proto=DBBoneData.prototype;
		__proto.initData=function(data){
			this.name=data.name;
			this.parent=data.parent;
			this.userData=data.userData;
			if (data.hasOwnProperty("inheritTranslation")){
				if (data.inheritTranslation==0){
					this.inheritTranslation=false;
					}else {
					this.inheritTranslation=true;
				}
			}
			if (data.hasOwnProperty("inheritRotation")){
				if (data.inheritRotation==0){
					this.inheritRotation=false;
					}else {
					this.inheritRotation=true;
				}
			}
			if (data.hasOwnProperty("inheritScale")){
				if (data.inheritScale==0){
					this.inheritScale=false;
					}else {
					this.inheritScale=true;
				}
			}
			if (data.hasOwnProperty("transform")){
				switch(data["transform"]){
					case "onlyTranslation":
						this.inheritScale=false;
						this.inheritRotation=false;
						break ;
					}
			}
			this.length=data.length;
		}

		__proto.getMatrix=function(){
			if (this.matrix==null){
				this.matrix=this.transform.getMatrix();
			}
			return this.matrix;
		}

		return DBBoneData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBBoneSlotData
	var DBBoneSlotData=(function(){
		function DBBoneSlotData(){
			this.name=null;
			this.parent=null;
			this.displayIndex=0;
			this.blendMode=null;
			this.userData=null;
			this.color=null;
			this.actions=null;
			this.attachmentName=null;
		}

		__class(DBBoneSlotData,'dragonBones.DBBoneSlotData');
		var __proto=DBBoneSlotData.prototype;
		__proto.initData=function(data){
			if (data.name){
				this.name=data.name;
			}
			if (data.parent){
				this.parent=data.parent;
			}
			if (data.displayIndex){
				this.displayIndex=data.displayIndex;
			}
			if (data.blendMode){
				this.blendMode=data.blendMode
			}
			if (data.userData){
				this.userData=data.userData;
			}
		}

		return DBBoneSlotData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBFrameData
	var DBFrameData=(function(){
		function DBFrameData(){
			this.duration=1;
			this.event=null;
			this.sound=null;
			this.time=0;
		}

		__class(DBFrameData,'dragonBones.DBFrameData');
		return DBFrameData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBSkinData
	var DBSkinData=(function(){
		function DBSkinData(){
			this.name=null;
			this.slotArr=[];
		}

		__class(DBSkinData,'dragonBones.DBSkinData');
		var __proto=DBSkinData.prototype;
		__proto.initData=function(data,armature){
			this.name=data.name;
			var tMySlotData;
			var tSlotData;
			var tSlotDataArr=data.slot;
			for (var i=0;i < tSlotDataArr.length;i++){
				tSlotData=tSlotDataArr[i];
				tMySlotData=new DBSlotData();
				tMySlotData.initData(tSlotData,armature);
				this.slotArr.push(tMySlotData);
			}
		}

		__proto.getDBSlotData=function(name){
			var tDBSlotData;
			for (var i=0;i < this.slotArr.length;i++){
				tDBSlotData=this.slotArr[i];
				if (tDBSlotData.name==name){
					return tDBSlotData;
				}
			}
			return null;
		}

		__proto.addSlotData=function(slotData){
			var tDBSlotData=this.getDBSlotData(slotData.name);
			if (tDBSlotData){
				return;
			}
			this.slotArr.push(slotData);
		}

		return DBSkinData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBSkinSlotDisplayData
	var DBSkinSlotDisplayData=(function(){
		function DBSkinSlotDisplayData(){
			this.name=null;
			this.attachmentName=null;
			this.type=0;
			this.transform=null;
			this.pivot=null;
			this.uvs=[];
			this.triangles=[];
			this.weights=[];
			this.vertices=[];
			this.slotPos=[];
			this.bonePose=[];
			this.lengths=[];
			this.vertexLen=0;
			this.edges=null;
			this.userEdges=null;
			this.width=0;
			this.height=0;
			this.skinned=false;
			this.slotPose=null;
			this.inverseBindPose=null;
			this.boneIndices=[];
			this.bones=[];
		}

		__class(DBSkinSlotDisplayData,'dragonBones.DBSkinSlotDisplayData');
		var __proto=DBSkinSlotDisplayData.prototype;
		__proto.initData=function(data,armature){
			this.attachmentName=this.name=data.name;
			switch (data.type){
				case "image":
					this.type=0;
					break ;
				case "mesh":
					this.type=1;
					break ;
				default :
					this.type=0;
					break ;
				}
			this.transform=new DBTransform();
			this.transform.initData(data.transform);
			this.pivot=data.pivot;
			if (data.uvs){
				this.uvs=data.uvs;
			}
			if (this.type==1){
				this.inverseBindPose=[];
				var tInverseBindPose=[];
				var tSkinned=false;
				if (data.weights && (data.weights).length > 0){
					tSkinned=true;
				}
				this.skinned=tSkinned;
				if (tSkinned){
					var tSlotPose=this.slotPose=new Matrix();
					var rawSlotPose;
					if (data.slotPose){
						rawSlotPose=data.slotPose;
						tSlotPose.setTo(rawSlotPose[0],rawSlotPose[1],rawSlotPose[2],rawSlotPose[3],rawSlotPose[4],rawSlotPose[5]);
					}
					if (data.bonePose){
						var rawBonePose=data.bonePose;
						for (var i=0,n=rawBonePose.length;i < n;i+=7){
							var boneMatrix=tInverseBindPose[rawBonePose[i]]=new Matrix();
							boneMatrix.a=rawBonePose[i+1];
							boneMatrix.b=rawBonePose[i+2];
							boneMatrix.c=rawBonePose[i+3];
							boneMatrix.d=rawBonePose[i+4];
							boneMatrix.tx=rawBonePose[i+5];
							boneMatrix.ty=rawBonePose[i+6];
							boneMatrix.invert();
						}
					}
				};
				var iW=0;
				var rawWeights=data.weights;
				var rawVertices=data.vertices;
				this.vertices=[];
				for (var i=0;i < rawVertices.length;i+=2){
					var tNext=i+1;
					var vertexIndex=i / 2;
					var x=this.vertices[i]=rawVertices[i];
					var y=this.vertices[tNext]=rawVertices[tNext];
					if (tSkinned){
						var indices=this.boneIndices[vertexIndex]=[];
						var tHelpPoint=new Point(x,y);
						LayaFactory.transformPoint(tSlotPose,tHelpPoint);
						this.vertices[i]=x=tHelpPoint.x;
						this.vertices[tNext]=y=tHelpPoint.y;
						var numBones=rawWeights[iW];
						this.bonePose.push(numBones);
						for (var iB=0;iB < numBones;iB++){
							var iI=iW+1+iB *2;
							var rawBoneIndex=rawWeights[iI];
							this.bonePose.push(rawBoneIndex);
							var boneData=armature.boneArr[rawBoneIndex];
							var boneIndex=this.bones.indexOf(boneData);
							if (boneIndex < 0){
								boneIndex=this.bones.length;
								this.bones[boneIndex]=boneData;
								this.inverseBindPose[boneIndex]=tInverseBindPose[rawBoneIndex];
							}
							indices.push(boneIndex);
							tHelpPoint.setTo(x,y);
							LayaFactory.transformPoint(this.inverseBindPose[boneIndex],tHelpPoint);
							this.weights.push(tHelpPoint.x,tHelpPoint.y);
							this.weights.push(rawWeights[iI+1]);
						}
						iW+=numBones *2+1;
						}else {
						this.weights.push(x,y);
					}
				}
				if (data.triangles){
					this.triangles=data.triangles;
				}
			}
		}

		return DBSkinSlotDisplayData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBSlotData
	var DBSlotData=(function(){
		function DBSlotData(){
			this.name=null;
			this.displayArr=[];
			this.defaultDisplayName=null;
		}

		__class(DBSlotData,'dragonBones.DBSlotData');
		var __proto=DBSlotData.prototype;
		__proto.initData=function(data,armature){
			this.name=data.name;
			var tMyDisplayData;
			var tDisplayData;
			var tDisplayDataArr=data.display;
			for (var h=0;h < tDisplayDataArr.length;h++){
				tDisplayData=tDisplayDataArr[h];
				tMyDisplayData=new DBSkinSlotDisplayData();
				tMyDisplayData.initData(tDisplayData,armature);
				this.displayArr.push(tMyDisplayData);
			}
		}

		__proto.findDisplayIndexByName=function(name){
			var tDBSkinSlotDisplayData;
			for (var i=0;i < this.displayArr.length;i++){
				tDBSkinSlotDisplayData=this.displayArr[i];
				if (tDBSkinSlotDisplayData.name==name){
					return i;
				}
			}
			return-1;
		}

		__proto.findDisplay=function(name){
			var tDisplayDta;
			for (var i=0;i < this.displayArr.length;i++){
				tDisplayDta=this.displayArr[i];
				if (tDisplayDta.name==name){
					return tDisplayDta;
				}
			}
			return null;
		}

		__proto.mergeOtherData=function(data){
			if (data){
				var tMyDisplayData;
				for (var i=0;i < data.displayArr.length;i++){
					tMyDisplayData=data.displayArr[i];
					if (this.findDisplay(tMyDisplayData.name)==null){
						this.displayArr.push(tMyDisplayData);
					}
				}
			}
		}

		return DBSlotData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBTextureData
	var DBTextureData=(function(){
		function DBTextureData(){
			this.x=0;
			this.y=0;
			this.w=0;
			this.h=0;
			this.frameX=0;
			this.frameY=0;
			this.frameW=0;
			this.frameH=0;
			this.name=null;
			this.textureSrc=null;
		}

		__class(DBTextureData,'dragonBones.DBTextureData');
		return DBTextureData;
	})()


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBTransform
	var DBTransform=(function(){
		function DBTransform(){
			this.skX=0;
			this.skY=0;
			this.scX=1;
			this.scY=1;
			this.x=0;
			this.y=0;
			this.skewX=0;
			this.skewY=0;
			this.skType=null;
			this.scType=null;
			this.posType=null;
			this.skewType=null;
			this.lockRotateKey=false;
			this.lockSkewKey=false;
			this.lockScaleKey=false;
			this.lockPositionKey=false;
		}

		__class(DBTransform,'dragonBones.DBTransform');
		var __proto=DBTransform.prototype;
		__proto.copyFrom=function(src){
			var keys=["skX","skY","scX","scY","x","y","skewX","skewY","skType","scType","posType","skewType"];
			var i=0,len=0;
			len=keys.length;
			for (i=0;i < len;i++){
				var key;
				key=keys[i];
				this[key]=src[key];
			}
		}

		__proto.isLinerCurve=function(arr){
			return arr[0]==0 && arr[1]==0 && arr[2]==1 && arr[3]==1;
		}

		__proto.setLerp=function(type,curve){
			if ((curve instanceof Array)){
				if (this.isLinerCurve(curve)){
					this.setCurves(null);
					}else{
					this.setCurves(curve);
				}
				return;
			}
			if (type===0){
				this.setCurves(null);
				return;
			}
			this.setCurves("stepped");
		}

		__proto.setCurves=function(curve){
			this.skType=curve;
			this.scType=curve;
			this.posType=curve;
			this.skewType=curve;
		}

		__proto.initData=function(data){
			if (data.x !=undefined){
				this.x=data.x;
			}
			if (data.y !=undefined){
				this.y=data.y;
			}
			if (data.skX !=undefined){
				this.skX=data.skX;
			}
			if (data.skY !=undefined){
				this.skY=data.skY;
			}
			if (Math.abs(this.skX-this.skY)>0.01){
				this.skewY=this.skX;
				this.skewX=this.skY;
				this.skX=this.skY=0;
			}
			if (data.scX !=undefined){
				this.scX=data.scX;
			}
			if (data.scY !=undefined){
				this.scY=data.scY;
			}
			if (data.skewX !=undefined){
				this.skewX=data.skewX;
			}
			if (data.skewY !=undefined){
				this.skewY=data.skewY;
			}
		}

		__proto.getMatrix=function(){
			//debugger;
			var tMatrix=new Matrix();
			if (this.skX !=0 || this.skY !=0){
				var tAngle=this.skX *Math.PI / 180;
				var cos=Math.cos(tAngle),sin=Math.sin(tAngle);
				tMatrix.setTo(this.scX *cos,this.scX *sin,this.scY *-sin,this.scY *cos,this.x,this.y);
				}else {
				tMatrix.setTo(this.scX,this.skX,this.skY,this.scY,this.x,this.y);
			}
			return tMatrix;
		}

		__proto.getCurveData=function(curve){
			if (!curve)return-1;
			if (curve=="stepped")return 0;
			if ((curve instanceof Array)){
			}
		}

		__proto.getType=function(){
			var list=["scType","skType","skType","scType","posType","posType","skewType","skewType"];
			var i=0,len=list.length;
			var isAllNull=true;
			var isAllStepped=true;
			for (i=0;i < len;i++){
				var tV;
				tV=this[list[i]];
				if (tV !=null){
					isAllNull=false;
				}
				if (tV !="stepped"){
					isAllStepped=false;
				}
			}
			if (isAllNull)return [254];
			if (isAllStepped)return [ 255];
			var rst;
			rst=[];
			for (i=0;i < len;i++){
				var tV;
				tV=this[list[i]];
				if (tV==null){
					rst.push(0);
					continue ;
				}
				if (tV=="stepped"){
					rst.push(5);
					continue ;
				}
				if ((tV instanceof Array)){
					switch(tV.length){
						case 4:
							rst.push(6,tV[0],tV[1],tV[2],tV[3]);
							break ;
						case 8:
							rst.push(7,tV[0],tV[1],tV[2],tV[3],tV[4],tV[5],tV[6],tV[7]);
							break ;
						case 10:
							rst.push(7,tV[0],tV[1],tV[2],tV[3],tV[4],tV[5],tV[6],tV[7]);
							tV[4]=tV[8];
							tV[5]=tV[9];
							tV.length=8;
							break ;
						default :
							rst.push(0);
						}
					continue ;
				}
				console.log("wrong type:",tV);
			}
			return rst;
		}

		__proto.getData=function(){
			return [this.scX,this.skX,this.skY,this.scY,this.x,this.y,this.skewX,this.skewY];
		}

		return DBTransform;
	})()


	/**
	*...
	*@author
	*/
	//class dragonBones.DragonBoneTools
	var DragonBoneTools=(function(){
		function DragonBoneTools(){
			this.nodePath=null;
			this.fs=null;
			this.mTools=null;
			this.mFileList=[];
			this.mCompleteFun=null;
			this.mFailFun=null;
			this.mType=0;
			this.mOutPath=null;
			this._completeNum=0;
			this._totalNum=0;
			this.nodePath=require("path");
			this.fs=require("fs");
		}

		__class(DragonBoneTools,'dragonBones.DragonBoneTools');
		var __proto=DragonBoneTools.prototype;
		__proto.loadFile=function(path,outPath,completeFun,failFun,type){
			(type===void 0)&& (type=0);
			if (this.mTools==null){
				this.mTools=new BoneAniTools();
			}
			this._completeNum=0;
			this.mType=type;
			this.mFileList.length=0;
			this.mOutPath=outPath;
			this.mFailFun=failFun;
			this.mCompleteFun=completeFun;
			this.walk(path,0,this.handleFile,this.mFileList);
			this._totalNum=this.mFileList.length;
			this.next();
		}

		__proto.next=function(){
			if (this.mFileList.length > 0){
				this._completeNum++;
				var tPath=this.mFileList.shift();
				if ((tPath instanceof Array)){
					var tArr=tPath;
					if (tArr.length==3){
						this.mTools.loadFile(this.nodePath,this,tPath[0],this.mOutPath,this.completeHandler,this.failHandler,this.mType,tPath[1],tArr[2]);
						}else{
						this.mTools.loadFile(this.nodePath,this,tPath[0],this.mOutPath,this.completeHandler,this.failHandler,this.mType,tPath[1]);
					}
					}else{
					this.mTools.loadFile(this.nodePath,this,tPath,this.mOutPath,this.completeHandler,this.failHandler,this.mType);
				}
				}else {
				var tInfo="";
				if (this._totalNum > 0){
					var tStr="符合条件的有"+this._totalNum+"个，已有"+this._completeNum+"个成功转换";
					tInfo+=tStr;
					}else {
					tInfo+="没找到可以被转换的文件,请确认文件夹名跟文件名是否一致";
				}
				this.mCompleteFun.call(null,tInfo);
			}
		}

		//mCompleteFun.call();
		__proto.failHandler=function(errorInfo){
			this.mFailFun.call(null,errorInfo);
		}

		__proto.completeHandler=function(sucess,data,picInput,picOutput){
			var buffer=new Buffer(data.byteLength);
			var view=new Uint8Array(data);
			for (var i=0;i < buffer.length;++i){
				buffer[i]=view[i];
			}
			this.mkdirsSyncLaya(this.nodePath.dirname(sucess));
			this.fs.writeFileSync(sucess,buffer);
			if (picInput){
				for (i=0;i < picInput.length;i++){
					this.mkdirsSyncLaya(this.nodePath.dirname(picOutput[i]));
					this.fs.writeFileSync(picOutput[i],this.fs.readFileSync(picInput[i]));
				}
			}
			this.mTools.clear();
			this.next();
		}

		__proto.mkdirsSyncLaya=function(dirname,mode){
			if (this.fs.existsSync(dirname)){
				return true;
				}else {
				if (this.mkdirsSyncLaya(this.nodePath.dirname(dirname),mode)){
					this.fs.mkdirSync(dirname,mode);
					return true;
				}
			}
			return false;
		}

		/*
		递归处理文件,文件夹
		path 路径
		floor 层数
		handleFile 文件,文件夹处理函数
		*/
		__proto.walk=function(path,floor,handleFile,out){
			var _$this=this;
			var tArray=[];
			handleFile(path,floor);
			floor++;
			var files=this.fs.readdirSync(path);
			files.forEach(function(item){
				var tmpPath=_$this.nodePath.join(path,item);
				var stats=_$this.fs.statSync(tmpPath);
				if (stats.isDirectory()){
					_$this.walk(tmpPath,floor,handleFile,out);
					}else {
					tArray.push(tmpPath);
					handleFile(tmpPath,floor);
				}
			});
			var tFileName=this.nodePath.basename(path).split(".")[0];
			var cType=0;
			var haha;
			haha=out;
			this.getOkFileList(this.mType,tArray,haha);
		}

		//trace(haha);
		__proto.getOkFileList=function(type,fileArray,rst){
			var i=0,len=0;
			len=fileArray.length;
			for (i=0;i < len;i++){
				var tRst;
				tRst=this.checkIsExportFile(type,fileArray[i],fileArray);
				if (tRst){
					rst.push(tRst);
				}
			}
			return rst;
		}

		__proto.checkIsExportFile=function(type,tFileName,fileArray){
			var name;
			name=this.getFileName(tFileName);
			if (name=="texture")return null;
			var tDir;
			tDir=this.getDir(tFileName);
			switch(type){
				case 0:
					if (tFileName.indexOf(".json")< 0)return null;
					if (this.haveFile("texture.png",fileArray)
						&& this.haveFile("texture.json",fileArray)
					&& this.haveFile(name+".json",fileArray)){
						return [tDir,0,name];
					}
					name+=".";
					if (name.indexOf("_ske.")< 0)return null;
					name=name.replace("_ske.","");
					if (this.haveFile(name+"_tex.png",fileArray)
						&& this.haveFile(name+"_tex.json",fileArray)
					&& this.haveFile(name+"_ske.json",fileArray)){
						return [tDir,2,name];
					}
					break ;
				case 1:
					if (tFileName.indexOf(".atlas")< 0)return null;
					if (this.haveFile(name+".png",fileArray)
						&& this.haveFile(name+".atlas",fileArray)
					&& this.haveFile(name+".json",fileArray)){
						return [tDir,0,name];
					}
					break ;
				}
			return null;
		}

		__proto.getFileName=function(path){
			return this.nodePath.basename(path).split(".")[0];
		}

		__proto.getDir=function(path){
			return this.nodePath.dirname(path);
		}

		/**
		*检测当前文件夹是否包含龙骨文件
		*@param type
		*@param name
		*@param fileArray
		*@return
		*/
		__proto.checkIsExport=function(type,name,fileArray){
			switch(type){
				case 0:
					if (this.haveFile("texture.png",fileArray)
						&& this.haveFile("texture.json",fileArray)
					&& this.haveFile(name+".json",fileArray)){
						return 0;
					}
					if (this.haveFile(name+"_tex.png",fileArray)
						&& this.haveFile(name+"_tex.json",fileArray)
					&& this.haveFile(name+"_ske.json",fileArray)){
						return 2;
					}
					break ;
				case 1:
					if (this.haveFile(name+".png",fileArray)
						&& this.haveFile(name+".atlas",fileArray)
					&& this.haveFile(name+".json",fileArray)){
						return 1;
					}
					break ;
				}
			return-1;
		}

		/**
		*在文件列表中，查找是否有指定的文件
		*@param fileName
		*@param fileArray
		*@return
		*/
		__proto.haveFile=function(fileName,fileArray){
			var tPath;
			for (var i=0;i < fileArray.length;i++){
				tPath=fileArray[i];
				if (tPath){
					if (tPath.indexOf(fileName)>-1){
						return true;
					}
				}
			}
			return false;
		}

		/**
		*
		*@param path
		*@param floor
		*/
		__proto.handleFile=function(path,floor){
			var blankStr='';
			for (var i=0;i < floor;i++){
				blankStr+='    ';
			}
			this.fs.stat(path,function(err1,stats){
				if (err1){
					console.log('stat error');
					}else {
					if (stats.isDirectory()){
						console.log('+'+blankStr+path);
						}else {
						console.log('-'+blankStr+path);
					}
				}
			})
		}

		return DragonBoneTools;
	})()


	/**
	*...
	*@author ...
	*/
	//class LayaAnimation.AnimationData
	var AnimationData=(function(){
		function AnimationData(){
			this.name=null;
			this.duration=NaN;
			this.boneLen=0;
			this.slotLen=0;
			this.ikLen=0;
			this.pathLen=0;
			this.animationNodeDatas=[];
		}

		__class(AnimationData,'LayaAnimation.AnimationData');
		return AnimationData;
	})()


	/**
	*...
	*@author ...
	*/
	//class LayaAnimation.AnimationNodeData
	var AnimationNodeData=(function(){
		function AnimationNodeData(){
			this.name=null;
			this.parent=null;
			this.lerpType=0;
			this.keyFrameWidth=0;
			this.privateData=[];
			this.keyFrameLerpTypes=[];
			this.keyFrameDatas=[];
		}

		__class(AnimationNodeData,'LayaAnimation.AnimationNodeData');
		AnimationNodeData.NOLerp=0;
		AnimationNodeData.NodeLerp=1;
		AnimationNodeData.FrameLerp=2;
		AnimationNodeData.ALLLiner=254;
		AnimationNodeData.ALLNone=255;
		AnimationNodeData.Liner=0;
		AnimationNodeData.None=5;
		return AnimationNodeData;
	})()


	/**
	*...
	*@author ...
	*/
	//class LayaAnimation.KeyFrameData
	var KeyFrameData=(function(){
		function KeyFrameData(){
			this.time=NaN;
			this.data=[];
			this.interpolationData=null;
		}

		__class(KeyFrameData,'LayaAnimation.KeyFrameData');
		return KeyFrameData;
	})()


	/**
	*...
	*@author ...
	*/
	//class LayaAnimation.LayaAnimationData
	var LayaAnimationData=(function(){
		function LayaAnimationData(){
			this.versionIdentifier=null;
			this.aniClassName=null;
			this.isAniDataRelative=false;
			this.extenData={};
			this.animationDatas=[];
		}

		__class(LayaAnimationData,'LayaAnimation.LayaAnimationData');
		return LayaAnimationData;
	})()


	/**
	*...
	*@author ww
	*/
	//class LayaAnimation.SpineAniFrames
	var SpineAniFrames=(function(){
		function SpineAniFrames(){
			this.frames=null;
		}

		__class(SpineAniFrames,'LayaAnimation.SpineAniFrames');
		var __proto=SpineAniFrames.prototype;
		__proto.setData=function(frames,type){
			this.frames=[];
			var i=0,len=0;
			SpineAniFrames.dealRotations(frames);
			len=frames.length;
			var tValue;
			for (i=0;i < len;i++){
				tValue=frames[i];
				this.frames[i]=tValue;
				tValue.time=SpineAniFrames.adptTime(tValue.time);
				switch(type){
					case "rotate":
						tValue.x=(tValue.angle || 0);
						tValue.y=(tValue.angle || 0);
						break ;
					case "scale":
						if (!tValue.hasOwnProperty("x")){
							tValue.x=1;
						}
						if (!tValue.hasOwnProperty("y")){
							tValue.y=1;
						}
						break ;
					default :
						tValue.x=(tValue.x || 0);
						tValue.y=(tValue.y || 0);
					}
			}
		}

		//}
		__proto.createDefault=function(defaultValue){
			(defaultValue===void 0)&& (defaultValue=0);
			var frames;
			frames=[];
			var tFrame;
			tFrame=this.createFrame(0);
			tFrame.x=tFrame.y=defaultValue;
			frames.push(tFrame);
			this.frames=frames;
		}

		__proto.createFrame=function(time){
			var frame;
			frame={};
			frame.time=time;
			frame.x=0;
			frame.y=0;
			frame.curve="stepped";
			return frame;
		}

		__proto.copyFrame=function(frame){
			var rst;
			rst={};
			rst.time=frame.time;
			rst.x=frame.x;
			rst.y=frame.y;
			rst.curve=frame.curve;
			return rst;
		}

		__proto.findFrameByTime=function(time){
			var i=0,len=0;
			len=this.frames.length;
			var tValue;
			for (i=0;i < len;i++){
				tValue=this.frames[i];
				if (tValue.time==time)return i;
			}
			return-1;
		}

		__proto.findNext=function(time){
			var i=0,len=0;
			len=this.frames.length;
			var tValue;
			for (i=0;i < len;i++){
				tValue=this.frames[i];
				if (tValue.time > time)return i;
			}
			return-1;
		}

		__proto.insertTimes=function(timeDic){
			var key;
			for (key in timeDic){
				this.insertFrame(parseFloat(key));
			}
		}

		__proto.getTimes=function(timeDic){
			var i=0,len=0;
			len=this.frames.length;
			var tValue;
			for (i=0;i < len;i++){
				tValue=this.frames[i];
				timeDic[tValue.time]=true;
			}
		}

		__proto.insertFrame=function(time){
			if (this.findFrameByTime(time)>=0)return;
			var tFrame;
			tFrame=this.frames[0];
			var newFrame;
			if (time < tFrame.time){
				newFrame=this.copyFrame(tFrame);
				newFrame.time=time;
				this.frames.unshift(newFrame);
				return;
			}
			tFrame=this.frames[this.frames.length-1];
			if (time > tFrame.time){
				newFrame=this.copyFrame(tFrame);
				newFrame.time=time;
				this.frames.push(newFrame);
				return;
			};
			var preIndex=0;
			var nextIndex=0;
			nextIndex=this.findNext(time);
			preIndex=nextIndex-1;
			tFrame=this.createFrame2(this.frames[preIndex],this.frames[nextIndex],time);
			this.frames.splice(preIndex+1,0,tFrame);
		}

		__proto.createFrame2=function(preFrame,nextFrame,time){
			var curve;
			curve=preFrame.curve;
			var tFrame;
			tFrame=this.copyFrame(preFrame);
			tFrame.time=time;
			var rate=NaN;
			if (!curve){
				rate=(time-preFrame.time)/ (nextFrame.time-preFrame.time);
				tFrame.x=preFrame.x+rate *(nextFrame.x-preFrame.x);
				tFrame.y=preFrame.y+rate *(nextFrame.y-preFrame.y);
				}else if (curve=="stepped"){
				}else if ((curve instanceof Array)){
				var curveArr;
				curveArr=curve;
				var newCurve=[];
				var i=0,len=0;
				len=curveArr.length;
				for (i=0;i < len;i++){
					newCurve.push(curveArr[i]);
				}
				if (curveArr.length==4){
					curveArr.push(preFrame.x,nextFrame.x-preFrame.x,0,nextFrame.time-preFrame.time,preFrame.y,nextFrame.y-preFrame.y);
					newCurve.push(preFrame.x,nextFrame.x-preFrame.x,time-preFrame.time,nextFrame.time-preFrame.time,preFrame.y,nextFrame.y-preFrame.y);
					tFrame.curve=newCurve;
					}else if (curveArr.length==10){
					newCurve[6]=newCurve[6]+time-preFrame.time;
					tFrame.curve=newCurve;
					}else{
					//debugger;
					rate=(time-preFrame.time)/ (nextFrame.time-preFrame.time);
					tFrame.x=preFrame.x+rate *(nextFrame.x-preFrame.x);
					tFrame.y=preFrame.y+rate *(nextFrame.y-preFrame.y);
				}
			}
			return tFrame;
		}

		SpineAniFrames.adptTime=function(time){
			return Math.round(time / SpineAniFrames.FrameInterval)*SpineAniFrames.FrameInterval;
		}

		SpineAniFrames.dealRotations=function(frames){
			var i=0,len=0;
			len=frames.length;
			var preAngle=0;
			var tAngle=NaN;
			var tFrame;
			var tD=NaN;
			for (i=0;i < len;i++){
				tFrame=frames[i];
				tAngle=tFrame.angle;
				tD=tAngle-preAngle;
				while (tD > 180){
					tD-=360;
				}
				while (tD <-180){
					tD+=360;
				}
				tAngle=preAngle+tD;
				tFrame.angle=tAngle;
				preAngle=tAngle;
			}
		}

		__static(SpineAniFrames,
		['FrameInterval',function(){return this.FrameInterval=1 / 30;}
		]);
		return SpineAniFrames;
	})()


	/**
	*...
	*@author ...
	*/
	//class LayaAnimation.TestLayaAnimation
	var TestLayaAnimation=(function(){
		// constructor
		function TestLayaAnimation(){}
		__class(TestLayaAnimation,'LayaAnimation.TestLayaAnimation');
		var __proto=TestLayaAnimation.prototype;
		__proto.getLayaAni=function(storageName){
			var layaAni;
			layaAni=new LayaAnimationData();
			layaAni.versionIdentifier="LAYASKELETON3D:01";
			layaAni.aniClassName="ANICLASS";
			layaAni.isAniDataRelative=true;
			var animationData0=new AnimationData();
			animationData0.name="animation0";
			animationData0.duration=99;
			layaAni.animationDatas.push(animationData0);
			var animationData1=new AnimationData();
			animationData1.name="animation1";
			animationData1.duration=78;
			layaAni.animationDatas.push(animationData1);
			var animationNodeData0=new AnimationNodeData();
			animationNodeData0.name="animationNode0";
			animationNodeData0.lerpType=1;
			animationNodeData0.keyFrameWidth=8;
			animationNodeData0.keyFrameLerpTypes.push(0,0,0,1,1,1,2,2);
			animationNodeData0.parent=null;
			animationNodeData0.privateData=[];
			animationData0.animationNodeDatas.push(animationNodeData0);
			var animationNodeData1=new AnimationNodeData();
			animationNodeData1.name="animationNode1";
			animationNodeData1.lerpType=1;
			animationNodeData1.keyFrameWidth=8;
			animationNodeData1.keyFrameLerpTypes.push(0,0,0,1,1,1,2,2);
			animationNodeData1.parent=animationNodeData0;
			animationNodeData1.privateData=[];
			animationData0.animationNodeDatas.push(animationNodeData1);
			var keyFrameData0=new KeyFrameData();
			keyFrameData0.time=0;
			keyFrameData0.data=[1.2,3.4,23,45,66,566,0,77];
			animationNodeData0.keyFrameDatas.push(keyFrameData0);
			var keyFrameData1=new KeyFrameData();
			keyFrameData1.time=100;
			keyFrameData1.data=[8.3,3.4,23,45,66,566,77,12];
			animationNodeData0.keyFrameDatas.push(keyFrameData1);
			var keyFrameData2=new KeyFrameData();
			keyFrameData2.time=200;
			keyFrameData2.data=[15.0,7.4,33,4.5,6.6,56.6,7.7,233];
			animationNodeData0.keyFrameDatas.push(keyFrameData2);
			var stringJSON=JSON.stringify(layaAni);
			return stringJSON;
		}

		__proto.getLayaBoneAni=function(armatures,textureDatas,boneType){
			(boneType===void 0)&& (boneType="DragonBone");
			var layaAni;
			layaAni=new LayaAnimationData();
			layaAni.versionIdentifier=AnimationTemplet.LAYA_ANIMATION_VISION;
			layaAni.versionIdentifier=Templet.LAYA_ANIMATION_VISION;
			layaAni.aniClassName=boneType;
			layaAni.isAniDataRelative=true;
			var tDBArmatureData;
			var tDBAnimationData;
			var tDBBoneData;
			var tAnimationData;
			var tAnimationNodeData;
			var tBoneNodeDic={};
			var tBoneNodeArr=[];
			var tIkData=[];
			var tTransData=[];
			var tPathData=[];
			var tDeformAniData=[];
			var tDrawOrderAniData=[];
			var tEventAniData=[];
			var tBoneMatrixArr=[];
			var tBoneArr=[];
			var i=0,j=0,z=0,k=0,h=0;
			for (i=0;i < armatures.length;i++){
				tDBArmatureData=armatures[i];
				if (tDBArmatureData.type !="Armature"&&tDBArmatureData.type !="MovieClip"){
					continue ;
				}
				tBoneArr=tDBArmatureData.boneArr;
				tIkData=tDBArmatureData.ikArr;
				tTransData=tDBArmatureData.transformArr;
				tPathData=tDBArmatureData.pathArr;
				var tOneFrameTime=tDBArmatureData.onFrameTime;
				for (j=0;j < tDBArmatureData.animationArr.length;j++){
					tBoneNodeDic={};
					tBoneNodeArr=[];
					tBoneMatrixArr=[];
					for (z=0;z < tDBArmatureData.boneArr.length;z++){
						tDBBoneData=tDBArmatureData.boneArr[z];
						var tParentNode=tBoneNodeDic[tDBBoneData.parent];
						if (tDBBoneData){
							tAnimationNodeData=new AnimationNodeData();
							tAnimationNodeData.name=tDBBoneData.name;
							tAnimationNodeData.lerpType=2;
							var li=0,llen=8;
							tAnimationNodeData.keyFrameLerpTypes=[];
							for (li=0;li < llen;li++){
							}
							tAnimationNodeData.parent=tParentNode;
							tAnimationNodeData.privateData=[];
							tAnimationNodeData.keyFrameWidth=8;
							tBoneNodeDic[tAnimationNodeData.name]=tAnimationNodeData;
							tBoneNodeArr.push(tAnimationNodeData);
							var tFrameDataArr=tDBBoneData.transform.getData();
							for (k=0;k < tFrameDataArr.length;k++){
								tBoneMatrixArr.push(tFrameDataArr[k]);
							}
						}
					}
					tDBAnimationData=tDBArmatureData.animationArr[j];
					tAnimationData=new AnimationData();
					tAnimationData.name=tDBAnimationData.name;
					tAnimationData.duration=tOneFrameTime *tDBAnimationData.duration;
					layaAni.animationDatas.push(tAnimationData);
					for (z=0;z < tBoneNodeArr.length;z++){
						tAnimationData.animationNodeDatas.push(tBoneNodeArr[z]);
					};
					var keyFrameData;
					var tKeyFrameData;
					tAnimationData.boneLen=tDBArmatureData.boneArr.length;
					for (z=0;z < tDBArmatureData.boneArr.length;z++){
						tDBBoneData=tDBArmatureData.boneArr[z];
						var tDBAniBoneData=this.getDBAniBoneData(tDBAnimationData,tDBBoneData.name);
						if (tDBAniBoneData){
							tAnimationNodeData=tBoneNodeDic[tDBAniBoneData.name];
							if (tAnimationNodeData){
								var tDBAniBoneFrameData;
								for (h=0;h < tDBAniBoneData.frameArr.length;h++){
									tDBAniBoneFrameData=tDBAniBoneData.frameArr[h];
									keyFrameData=new KeyFrameData();
									keyFrameData.time=tDBAniBoneFrameData.duration *tOneFrameTime;
									var tDataArr=keyFrameData.data=tDBAniBoneFrameData.transform.getData();
									keyFrameData.interpolationData=tDBAniBoneFrameData.transform.getType();
									tAnimationNodeData.keyFrameDatas.push(keyFrameData);
								}
								if (tAnimationNodeData.keyFrameDatas.length > 0){
									keyFrameData=tAnimationNodeData.keyFrameDatas[tAnimationNodeData.keyFrameDatas.length-1];
									if (keyFrameData){
										if (keyFrameData.time !=0){
											tKeyFrameData=new KeyFrameData();
											tKeyFrameData.time=0;
											tKeyFrameData.data=keyFrameData.data;
											tKeyFrameData.interpolationData=keyFrameData.interpolationData;
											tAnimationNodeData.keyFrameDatas.push(tKeyFrameData);
										}
									}
								}
							}
						}
					};
					var tAniSlotData;
					var tAniSlotFrameData;
					tAnimationData.slotLen=tDBAnimationData.slotArr.length;
					for (z=0;z < tDBAnimationData.slotArr.length;z++){
						tAniSlotData=tDBAnimationData.slotArr[z];
						if (tAniSlotData.frameArr.length > 0){
							tAnimationNodeData=new AnimationNodeData();
							tAnimationData.animationNodeDatas.push(tAnimationNodeData);
							tAnimationNodeData.name=tAniSlotData.name;
							tAnimationNodeData.lerpType=1;
							tAnimationNodeData.keyFrameLerpTypes.push(5,0,0,0,0,0);
							tAnimationNodeData.parent=null;
							tAnimationNodeData.privateData=[];
							tAnimationNodeData.keyFrameWidth=6;
							for (h=0;h < tAniSlotData.frameArr.length;h++){
								tAniSlotFrameData=tAniSlotData.frameArr[h];
								keyFrameData=new KeyFrameData();
								keyFrameData.time=tAniSlotFrameData.duration *tOneFrameTime;
								keyFrameData.data=tAniSlotFrameData.getData();
								tAnimationNodeData.keyFrameDatas.push(keyFrameData);
							}
							if (tAnimationNodeData.keyFrameDatas.length > 0){
								keyFrameData=tAnimationNodeData.keyFrameDatas[tAnimationNodeData.keyFrameDatas.length-1];
								if (keyFrameData){
									if (keyFrameData.time !=0){
										tKeyFrameData=new KeyFrameData();
										tKeyFrameData.time=0;
										tKeyFrameData.data=keyFrameData.data;
										tAnimationNodeData.keyFrameDatas.push(tKeyFrameData);
									}
								}
							}
						}
					};
					var tIkAniData;
					var tSpineIkCD;
					tAnimationData.ikLen=tDBAnimationData.ikArr.length;
					for (z=0;z < tDBAnimationData.ikArr.length;z++){
						tIkAniData=tDBAnimationData.ikArr [z];
						if (tIkAniData.mDataList.length > 0){
							tAnimationNodeData=new AnimationNodeData();
							tAnimationData.animationNodeDatas.push(tAnimationNodeData);
							tAnimationNodeData.name=tIkAniData.name;
							tAnimationNodeData.lerpType=1;
							tAnimationNodeData.keyFrameLerpTypes.push(5,5,0,0,0,0);
							tAnimationNodeData.parent=null;
							tAnimationNodeData.privateData=[];
							tAnimationNodeData.keyFrameWidth=6;
							for (h=0;h < tIkAniData.mDataList.length;h++){
								tSpineIkCD=tIkAniData.mDataList[h];
								keyFrameData=new KeyFrameData();
								keyFrameData.time=tSpineIkCD.duration *tOneFrameTime;
								keyFrameData.data=tSpineIkCD.getData();
								tAnimationNodeData.keyFrameDatas.push(keyFrameData);
							}
							if (tAnimationNodeData.keyFrameDatas.length > 0){
								keyFrameData=tAnimationNodeData.keyFrameDatas[tAnimationNodeData.keyFrameDatas.length-1];
								if (keyFrameData){
									if (keyFrameData.time !=0){
										tKeyFrameData=new KeyFrameData();
										tKeyFrameData.time=0;
										tKeyFrameData.data=keyFrameData.data;
										tAnimationNodeData.keyFrameDatas.push(tKeyFrameData);
									}
								}
							}
						}
					};
					var tPathAniData;
					var tPathCD;
					tAnimationData.pathLen=tDBAnimationData.pathArr.length;
					for (z=0;z < tAnimationData.pathLen;z++){
						tPathAniData=tDBAnimationData.pathArr [z];
						if (tPathAniData.mDataList.length > 0){
							tAnimationNodeData=new AnimationNodeData();
							tAnimationData.animationNodeDatas.push(tAnimationNodeData);
							tAnimationNodeData.name=tPathAniData.pathName;
							tAnimationNodeData.lerpType=1;
							switch(tPathAniData.typeInt){
								case 1:
									tAnimationNodeData.keyFrameWidth=1;
									tAnimationNodeData.keyFrameLerpTypes.push(0);
									break ;
								case 2:
									tAnimationNodeData.keyFrameWidth=1;
									tAnimationNodeData.keyFrameLerpTypes.push(0);
									break ;
								case 3:
									tAnimationNodeData.keyFrameWidth=2;
									tAnimationNodeData.keyFrameLerpTypes.push(0,0);
									break ;
								}
							tAnimationNodeData.parent=null;
							tAnimationNodeData.privateData=[tPathAniData.typeInt];
							for (h=0;h < tPathAniData.mDataList.length;h++){
								tPathCD=tPathAniData.mDataList[h];
								keyFrameData=new KeyFrameData();
								keyFrameData.time=tPathCD.duration *tOneFrameTime;
								keyFrameData.data=tPathCD.getData(tPathAniData.typeInt);
								tAnimationNodeData.keyFrameDatas.push(keyFrameData);
							}
							if (tAnimationNodeData.keyFrameDatas.length > 0){
								keyFrameData=tAnimationNodeData.keyFrameDatas[tAnimationNodeData.keyFrameDatas.length-1];
								if (keyFrameData){
									if (keyFrameData.time !=0){
										tKeyFrameData=new KeyFrameData();
										tKeyFrameData.time=0;
										tKeyFrameData.data=keyFrameData.data;
										tAnimationNodeData.keyFrameDatas.push(tKeyFrameData);
									}
								}
							}
						}
					}
					tDeformAniData.push(tDBAnimationData.deformSkinAniList);
					tDrawOrderAniData.push(tDBAnimationData.drawOrderArr);
					tEventAniData.push(tDBAnimationData.eventArr);
				}
				layaAni.extenData.BoneSlotArr=tDBArmatureData.slotArr;
				layaAni.extenData.SkinArr=tDBArmatureData.skinArr;
				layaAni.extenData.attachments=tDBArmatureData.attachmentNames;
				break ;
			}
			layaAni.extenData.boneArr=tBoneArr;
			layaAni.extenData.matrixDataLen=8;
			layaAni.extenData.srcBoneMatrixLength=tBoneMatrixArr.length;
			layaAni.extenData.srcBoneMatrix=tBoneMatrixArr;
			layaAni.extenData.ikArr=tIkData;
			layaAni.extenData.transData=tTransData;
			layaAni.extenData.pathArr=tPathData;
			layaAni.extenData.textureData=textureDatas;
			layaAni.extenData.deformAniData=tDeformAniData;
			layaAni.extenData.drawOrderAniData=tDrawOrderAniData;
			layaAni.extenData.eventAniData=tEventAniData;
			return layaAni;
		}

		__proto.getAnimData=function(){}
		__proto.getDBAniBoneData=function(animationData,name){
			for (var i=0,n=animationData.boneArr.length;i < n;i++){
				var tAniBoneData=animationData.boneArr[i];
				if (tAniBoneData.name==name){
					return tAniBoneData;
				}
			}
			return null;
		}

		return TestLayaAnimation;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.Atlas
	var Atlas=(function(){
		function Atlas(){
			this.regions=[];
		}

		__class(Atlas,'Spine.Atlas');
		var __proto=Atlas.prototype;
		__proto.findRegion=function(name){
			for (var i=0;i < this.regions.length;i++){
				if (this.regions[i].name==name){
					return this.regions[i];
				}
			}
			return this.regions[0];
		}

		__proto.preInit=function(data){
			var tTexturePathList=[];
			var tText=data;
			var reader=new Reader();
			reader.init(tText);
			var page=null;
			while (true){
				var line=reader.readLine();
				if (line==null){
					break ;
				}
				line=reader.trim(line);
				if (line.length==0){
					page=null
					}else if(!page){
					page=new AtlasPage();
					tTexturePathList.push(line);
				}
			}
			return tTexturePathList;
		}

		__proto.init=function(textureMap,data){
			var tText=data;
			var reader=new Reader();
			reader.init(tText);
			var tuple=[];
			tuple.length=4;
			var page=null;
			while (true){
				var line=reader.readLine();
				if (line==null){
					break ;
				}
				line=reader.trim(line);
				if (line.length==0){
					page=null
					}else if (!page){
					page=new AtlasPage();
					page.name=line;
					if (reader.readTuple(tuple)==2){
						page.width=parseInt(tuple[0]);
						page.height=parseInt(tuple[1]);
						reader.readTuple(tuple);
					}
					page.format=tuple[0];
					reader.readTuple(tuple);
					page.minFilter=tuple[0];
					page.magFilter=tuple[1];
					var direction=reader.readValue();
					page.uWrap=0;
					page.vWrap=0;
					if (direction=="x"){
						}else if (direction=="y"){
						}else if (direction=="xy"){
					};
					var tTexture=textureMap[line];
					if (tTexture){
						page.rendererObject=tTexture;
						page.width=tTexture.width;
						page.height=tTexture.height;
					}
					}else {
					var region=new AtlasRegion();
					region.name=line;
					region.page=page;
					region.rotate=reader.readValue()=="true";
					reader.readTuple(tuple);
					var x=parseInt(tuple[0]);
					var y=parseInt(tuple[1]);
					reader.readTuple(tuple);
					var width=parseInt(tuple[0]);
					var height=parseInt(tuple[1]);
					region.u=x / page.width;
					region.v=y / page.height;
					if (region.rotate){
						region.u2=(x+height)/ page.width;
						region.v2=(y+width)/ page.height;
						}else {
						region.u2=(x+width)/ page.width;
						region.v2=(y+height)/ page.height;
					}
					region.x=x;
					region.y=y;
					region.width=Math.abs(width);
					region.height=Math.abs(height);
					if (reader.readTuple(tuple)==4){
						region.splits=new Array(parseInt(tuple[0]),parseInt(tuple[1]),parseInt(tuple[2]));
						if (reader.readTuple(tuple)==4){
							region.pads=(parseInt(tuple[0]),parseInt(tuple[1]),parseInt(tuple[2]));
							reader.readTuple(tuple);
						}
					}
					region.originalWidth=parseInt(tuple[0]);
					region.originalHeight=parseInt(tuple[1]);
					reader.readTuple(tuple);
					region.offsetX=parseInt(tuple[0]);
					region.offsetY=parseInt(tuple[1]);
					region.index=parseInt(reader.readValue());
					this.regions[this.regions.length]=region;
				}
			}
		}

		return Atlas;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.AtlasPage
	var AtlasPage=(function(){
		function AtlasPage(){
			this.name=null;
			this.format=null;
			this.minFilter=null;
			this.magFilter=null;
			this.uWrap=null;
			this.vWrap=null;
			this.rendererObject=null;
			this.width=0;
			this.height=0;
		}

		__class(AtlasPage,'Spine.AtlasPage');
		return AtlasPage;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.AtlasRegion
	var AtlasRegion=(function(){
		function AtlasRegion(){
			this.page=null;
			this.name=null;
			this.x=0;
			this.y=0;
			this.width=0;
			this.height=0;
			this.u=NaN;
			this.v=NaN;
			this.u2=NaN;
			this.v2=NaN;
			this.offsetX=NaN;
			this.offsetY=NaN;
			this.originalWidth=0;
			this.originalHeight=0;
			this.index=0;
			this.rotate=false;
			this.splits=null;
			this.pads=null;
			this.rendererObject=null;
		}

		__class(AtlasRegion,'Spine.AtlasRegion');
		return AtlasRegion;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.Attachment
	var Attachment=(function(){
		function Attachment(name){
			this.name=null;
			this.type=-1;
			this.mDBSkinSlotDisplayData=null;
			this.name=name;
		}

		__class(Attachment,'Spine.Attachment');
		return Attachment;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.BoneAniData
	var BoneAniData=(function(){
		function BoneAniData(){
			this.mMaxTime=0;
			this.mPreRotate=0;
			this.mPreScaleX=1;
			this.mPreScaleY=1;
			this.mPreTransX=0;
			this.mPreTransY=0;
			this.mPreSkewX=0;
			this.mPreSkewY=0;
			this.mPreRotateIndex=0;
			this.mPreScaleIndex=0;
			this.mPreTransIndex=0;
			this.mPreSkewIndex=0;
			this.mTransList=[];
			this.mTimeList=[];
		}

		__class(BoneAniData,'Spine.BoneAniData');
		var __proto=BoneAniData.prototype;
		__proto.addData=function(time,type,data){
			var tTransform;
			var tLastTransform;
			if (this.mTimeList.length==0){
				this.mMaxTime=time;
				this.mTimeList.push(time);
				tTransform=new DBTransform();
				this.mTransList.push(tTransform);
				this.mergeData(tTransform,type,data,0);
				return;
			};
			var i=0;
			var n=0;
			var tAddKey=true;
			for (i=0,n=this.mTimeList.length;i < n;i++){
				if (this.mTimeList[i]==time){
					tAddKey=false;
					tTransform=this.mTransList[i];
					this.mergeData(tTransform,type,data,i,false);
					break ;
				}
			}
			if (tAddKey){
				if (time > this.mMaxTime){
					this.mMaxTime=time;
					this.mTimeList.push(time);
					tTransform=new DBTransform();
					this.mTransList.push(tTransform);
					this.mergeData(tTransform,type,data,this.mTransList.length-1);
					}else {
					var tTime=0;
					for (i=0,n=this.mTimeList.length;i < n;i++){
						tTime=this.mTimeList[i];
						if (time < tTime){
							this.mTimeList.splice(i,0,time);
							tTransform=new DBTransform();
							this.mTransList.splice(i,0,tTransform);
							this.mergeData(tTransform,type,data,i);
							break ;
						}
					}
				}
			}
		}

		__proto.mergeData=function(_transform,type,data,index,createKey){
			(createKey===void 0)&& (createKey=true);
			var tTransform,i=0;
			if (createKey){
				if (index > 0){
					var tPreTransform=this.mTransList[index-1];
					_transform.scX=tPreTransform.scX;
					_transform.skX=tPreTransform.skX;
					_transform.skY=tPreTransform.skY;
					_transform.scY=tPreTransform.scY;
					_transform.x=tPreTransform.x;
					_transform.y=tPreTransform.y;
					_transform.skewX=tPreTransform.skewX;
					_transform.skewY=tPreTransform.skewY;
				}
			}
			switch(type){
				case "shear":
					for (i=index;i < this.mTransList.length;i++){
						tTransform=this.mTransList[i];
						tTransform.skewX=data[0];
						tTransform.skewY=data[1];
					}
					for (i=this.mPreTransIndex;i < index;i++){
						tTransform=this.mTransList[i];
						if (!tTransform.lockSkewKey){
							tTransform.lockSkewKey=true;
							tTransform.skewX=this.mPreSkewX;
							tTransform.skewY=this.mPreSkewY;
						}
					}
					this.mPreSkewIndex=index+1;
					this.mPreSkewX=data[0];
					this.mPreSkewY=data[1];
					_transform.skewType=data[2];
					break ;
				case "rotate":
					_transform.skType=data[1];
					var tAngle=data[0];
					if (tAngle > 180){
						tAngle-=360;
					}
					if (tAngle <-180){
						tAngle+=360;
					}
					for (i=index;i < this.mTransList.length;i++){
						tTransform=this.mTransList[i];
						tTransform.skX=tTransform.skY=tAngle;
					}
					for (i=this.mPreRotateIndex;i < index;i++){
						tTransform=this.mTransList[i];
						if (!tTransform.lockRotateKey){
							tTransform.lockRotateKey=true;
							tTransform.skX=tTransform.skY=this.mPreRotate;
						}
					}
					this.mPreRotateIndex=index+1;
					this.mPreRotate=tAngle;
					break ;
				case "translate":
					_transform.posType=data[2];
					for (i=index;i < this.mTransList.length;i++){
						tTransform=this.mTransList[i];
						tTransform.x=data[0];
						tTransform.y=data[1];
					}
					for (i=this.mPreTransIndex;i < index;i++){
						tTransform=this.mTransList[i];
						if (!tTransform.lockPositionKey){
							tTransform.lockPositionKey=true;
							tTransform.x=this.mPreTransX;
							tTransform.y=this.mPreTransY;
						}
					}
					this.mPreTransIndex=index+1;
					this.mPreTransX=data[0];
					this.mPreTransY=data[1];
					break ;
				case "scale":
					_transform.scType=data[2];
					for (i=index;i < this.mTransList.length;i++){
						tTransform=this.mTransList[i];
						tTransform.scX=data[0];
						tTransform.scY=data[1];
					}
					for (i=this.mPreScaleIndex;i < index;i++){
						tTransform=this.mTransList[i];
						if (!tTransform.lockScaleKey){
							tTransform.lockScaleKey=true;
							tTransform.scX=this.mPreScaleX;
							tTransform.scY=this.mPreScaleY;
						}
					}
					this.mPreScaleIndex=index+1;
					this.mPreScaleX=data[0];
					this.mPreScaleY=data[1];
					break ;
				}
		}

		return BoneAniData;
	})()


	/**
	*...
	*@author ww
	*/
	//class Spine.BoneAniDataNew
	var BoneAniDataNew=(function(){
		function BoneAniDataNew(){
			this.framesDic={};
			this.mTransList=[];
			this.mTimeList=[];
		}

		__class(BoneAniDataNew,'Spine.BoneAniDataNew');
		var __proto=BoneAniDataNew.prototype;
		__proto.adptFrames=function(frames){
			var timeDic;
			var sames=[];
			timeDic={};
			var i=0,len=0;
			len=frames.length-1;
			for (i=len;i >=0;i--){
				var tTime=NaN;
				frames[i].time=SpineAniFrames.adptTime(frames[i].time);
				tTime=frames[i].time;
				if (timeDic[tTime]){
					frames.splice(timeDic[tTime],1);
				}
				timeDic[tTime]=i;
			};
			frames.sort(this.sortFrameByTimeFun);
		}

		//debugger;
		__proto.sortFrameByTimeFun=function(frameA,frameB){
			return frameA.time-frameB.time;
		}

		__proto.addFrames=function(type,frames){
			this.adptFrames(frames);
			var tFrames=new SpineAniFrames();
			tFrames.setData(frames,type);
			this.framesDic[type]=tFrames;
		}

		__proto.buildFrames=function(){
			var timeDic={};
			var i=0,len=0;
			len=BoneAniDataNew.Keys.length;
			var tAniFrames;
			var key;
			for (i=0;i < len;i++){
				key=BoneAniDataNew.Keys[i];
				tAniFrames=this.framesDic[key];
				if (tAniFrames){
					tAniFrames.getTimes(timeDic);
					}else{
					tAniFrames=new SpineAniFrames();
					if (key !="scale"){
						tAniFrames.createDefault(0);
						}else{
						tAniFrames.createDefault(1);
					}
					this.framesDic[key]=tAniFrames;
				}
			}
			for (i=0;i < len;i++){
				key=BoneAniDataNew.Keys[i];
				tAniFrames=this.framesDic[key];
				if (tAniFrames){
					tAniFrames.insertTimes(timeDic);
				}
			};
			var timeList=[];
			var transList=[];
			for (i=0;i < len;i++){
				key=BoneAniDataNew.Keys[i];
				tAniFrames=this.framesDic[key];
				if (tAniFrames){
					var frames;
					frames=tAniFrames.frames;
					this.setValue(frames,key,timeList,transList);
				}
			}
			this.mTransList=transList;
			this.mTimeList=timeList;
		}

		__proto.setValue=function(frames,key,timeList,transList){
			var i=0,len=0;
			len=frames.length;
			for (i=0;i < len;i++){
				if (!timeList[i]){
					timeList[i]=frames[i].time;
				}
				if (!transList[i]){
					transList[i]=new DBTransform();
				};
				var tTrans;
				tTrans=transList[i];
				var tFrame;
				tFrame=frames[i];
				switch (key){
					case "rotate":
						tTrans.skType=tFrame.curve;
						var tAngle=tFrame.x;
						tTrans.skX=tTrans.skY=tAngle;
						break ;
					case "translate":
						tTrans.posType=tFrame.curve;
						tTrans.x=tFrame.x;
						tTrans.y=tFrame.y;
						break ;
					case "scale":
						tTrans.scType=tFrame.curve;
						tTrans.scX=tFrame.x;
						tTrans.scY=tFrame.y;
						break ;
					case "shear":
						tTrans.skewType=tFrame.curve;
						tTrans.skewX=tFrame.x;
						tTrans.skewY=tFrame.y;
						break ;
					}
			}
		}

		__static(BoneAniDataNew,
		['Keys',function(){return this.Keys=["rotate","translate","scale","shear"];}
		]);
		return BoneAniDataNew;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.BoneData
	var BoneData=(function(){
		function BoneData(){
			this.name=null;
			this.parent=null;
			this.length=NaN;
			this.x=NaN;
			this.y=NaN;
			this.rotation=NaN;
			this.scaleX=1;
			this.scaleY=1;
			this.shearX=NaN;
			this.shearY=NaN;
			this.inheritScale=true;
			this.inheritRotation=true;
			this.resultX=NaN;
			this.resultY=NaN;
			this.resultRotation=NaN;
			this.resultScaleX=NaN;
			this.resultScaleY=NaN;
			this.resultMatrix=null;
			this.skeleton=null;
			this.a=NaN;
			this.b=NaN;
			this.c=NaN;
			this.d=NaN;
			this.worldX=NaN;
			this.worldY=NaN;
			this._a=NaN;
			this._b=NaN;
			this._c=NaN;
			this._d=NaN;
			this._worldX=NaN;
			this._worldY=NaN;
			this._worldSignX=NaN;
			this._worldSignY=NaN;
		}

		__class(BoneData,'Spine.BoneData');
		var __proto=BoneData.prototype;
		__proto.updateWorldTransformWith=function(x,y,rotation,scaleX,scaleY,shearX,shearY){}
		return BoneData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.DeformAniData
	var DeformAniData=(function(){
		function DeformAniData(){
			this.mMaxTime=0;
			this.mFrameVertices=[];
			this.mTimeList=[];
		}

		__class(DeformAniData,'Spine.DeformAniData');
		var __proto=DeformAniData.prototype;
		__proto.addData=function(time,data){}
		return DeformAniData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.DeformSkinAni
	var DeformSkinAni=(function(){
		function DeformSkinAni(){
			this.name=null;
			this.deformSlotDic={};
			this.deformSlotArray=[];
		}

		__class(DeformSkinAni,'Spine.DeformSkinAni');
		return DeformSkinAni;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.DeformSlotData
	var DeformSlotData=(function(){
		function DeformSlotData(){
			this.mDisplayArray=[];
		}

		__class(DeformSlotData,'Spine.DeformSlotData');
		return DeformSlotData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.DeformSlotDisplayData
	var DeformSlotDisplayData=(function(){
		function DeformSlotDisplayData(){
			this.slotIndex=0;
			this.attachment=null;
			this.timeList=[];
			this.tweenKeyList=[];
			this.vectices=[];
		}

		__class(DeformSlotDisplayData,'Spine.DeformSlotDisplayData');
		var __proto=DeformSlotDisplayData.prototype;
		__proto.addData=function(time,data,tweenKey){
			this.timeList.push(time);
			this.vectices.push(data);
			this.tweenKeyList.push(tweenKey);
		}

		return DeformSlotDisplayData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.DrawOrderAniData
	var DrawOrderAniData=(function(){
		function DrawOrderAniData(){
			this.time=NaN;
			this.orderArr=null;
		}

		__class(DrawOrderAniData,'Spine.DrawOrderAniData');
		return DrawOrderAniData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.EventAniData
	var EventAniData=(function(){
		function EventAniData(){
			this.mEventArr=[];
		}

		__class(EventAniData,'Spine.EventAniData');
		return EventAniData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.EventData
	var EventData=(function(){
		function EventData(){
			this.name=null;
			this.intValue=0;
			this.floatValue=NaN;
			this.stringValue=null;
			this.time=NaN;
		}

		__class(EventData,'Spine.EventData');
		return EventData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.IkAniData
	var IkAniData=(function(){
		function IkAniData(){
			this.name=null;
			this.mMaxTime=0;
			this.mDataList=[];
		}

		__class(IkAniData,'Spine.IkAniData');
		var __proto=IkAniData.prototype;
		__proto.addData=function(time,bendDirection,mix){
			var tIkData=new SpineIkConstraintData();
			tIkData.bendDirection=bendDirection;
			tIkData.mix=mix;
			tIkData.time=time;
			if (this.mDataList.length==0){
				this.mMaxTime=time;
				this.mDataList.push(tIkData);
				return;
			};
			var i=0;
			var n=0;
			if (time > this.mMaxTime){
				this.mMaxTime=time;
				this.mDataList.push(tIkData);
				}else {
				var tTime=0;
				for (i=0,n=this.mDataList.length;i < n;i++){
					tTime=this.mDataList[i].time;
					if (time < tTime){
						this.mDataList.splice(i,0,tIkData);
						break ;
					}
				}
			}
		}

		return IkAniData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.LinkedMesh
	var LinkedMesh=(function(){
		function LinkedMesh(){
			this.parent=null;
			this.skin=null;
			this.slotIndex=0;
			this.mesh=null;
		}

		__class(LinkedMesh,'Spine.LinkedMesh');
		return LinkedMesh;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.PathAniData
	var PathAniData=(function(){
		function PathAniData(){
			this.pathName=null;
			this.index=-1;
			this.mMaxTime=0;
			this.type=null;
			this.typeInt=-1;
			this.mDataList=[];
		}

		__class(PathAniData,'Spine.PathAniData');
		var __proto=PathAniData.prototype;
		__proto.addData=function(time,data){
			var tPathData=new PathConstraintData();
			tPathData.time=time;
			this.mergeData(tPathData,data);
			if (this.mDataList.length==0){
				this.mMaxTime=time;
				this.mDataList.push(tPathData);
				return;
			};
			var i=0;
			var n=0;
			if (time > this.mMaxTime){
				this.mMaxTime=time;
				this.mDataList.push(tPathData);
				}else {
				var tTime=0;
				for (i=0,n=this.mDataList.length;i < n;i++){
					tTime=this.mDataList[i].time;
					if (time < tTime){
						this.mDataList.splice(i,0,tPathData);
						break ;
					}
				}
			}
		}

		__proto.mergeData=function(frameData,data){
			var i=0;
			switch(this.type){
				case "position":
					this.typeInt=1;
					frameData.position=data[0];
					break ;
				case "spacing":
					this.typeInt=2;
					frameData.spacing=data[0];
					break ;
				case "mix":
					this.typeInt=3;
					frameData.rotateMix=data[0];
					frameData.translateMix=data[1];
					break ;
				}
		}

		return PathAniData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.PathConstraintData
	var PathConstraintData=(function(){
		function PathConstraintData(){
			this.name=null;
			this.target=null;
			this.positionMode=null;
			this.spacingMode=null;
			this.rotateMode=null;
			this.offsetRotation=NaN;
			this.position=NaN;
			this.spacing=NaN;
			this.rotateMix=NaN;
			this.translateMix=NaN;
			this.time=0;
			this.duration=0;
			this.bones=[];
			this.boneIds=[];
		}

		__class(PathConstraintData,'Spine.PathConstraintData');
		var __proto=PathConstraintData.prototype;
		__proto.copy=function(){
			var tPathConstraintData=new PathConstraintData();
			tPathConstraintData.name=this.name;
			tPathConstraintData.position=this.position;
			tPathConstraintData.spacing=this.spacing;
			tPathConstraintData.rotateMix=this.rotateMix;
			tPathConstraintData.translateMix=this.translateMix;
			return tPathConstraintData;
		}

		__proto.getData=function(type){
			switch(type){
				case 1:
					return [this.position];
					break ;
				case 2:
					return [this.spacing];
					break ;
				case 3:
					return [this.rotateMix,this.translateMix];
					break ;
				}
			return null;
		}

		return PathConstraintData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.Reader
	var Reader=(function(){
		function Reader(){
			this.lines=null;
			this.index=0;
		}

		__class(Reader,'Spine.Reader');
		var __proto=Reader.prototype;
		__proto.init=function(text){
			this.lines=text.split(/\r\n|\r|\n/);
		}

		__proto.trim=function(value){
			if (value==null || value==""){
				return value;
			}
			return value.replace(/^\s+|\s+$/g,"");
		}

		__proto.readLine=function(){
			if (this.index >=this.lines.length){
				return null;
			}
			return this.lines[this.index++];
		}

		__proto.readValue=function(){
			var line=this.readLine();
			var colon=line.indexOf(":");
			if (colon==-1){
				console.log("error:....");
			}
			return this.trim(line.substring(colon+1));
		}

		__proto.readTuple=function(tuple){
			var line=this.readLine();
			var colon=line.indexOf(":");
			if (colon==-1){
				console.log("error:.............");
			};
			var i=0;
			var lastMatch=colon+1;
			for (;i < 3;i++){
				var comma=line.indexOf(",",lastMatch);
				if (comma==-1)break ;
				tuple[i]=this.trim(line.substr(lastMatch,comma-lastMatch));
				lastMatch=comma+1;
			}
			tuple[i]=this.trim(line.substring(lastMatch));
			return i+1;
		}

		return Reader;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.SkeletonData
	var SkeletonData=(function(){
		function SkeletonData(){
			this.name=null;
			this.bones=null;
			this.slots=null;
			this.skins=null;
			this.defaultSkin=null;
			this.events=null;
			this.ikConstraints=null;
			this.transformConstraints=null;
			this.pathConstraints=null;
			this.flipX=false;
			this.flipY=false;
			this.mArmatureArr=[];
			this.bones=[];
			this.slots=[];
			this.skins=[];
			this.events=[];
			this.ikConstraints=[];
			this.transformConstraints=[];
			this.pathConstraints=[];
		}

		__class(SkeletonData,'Spine.SkeletonData');
		var __proto=SkeletonData.prototype;
		__proto.findBoneIndex=function(boneName){
			if (boneName==null)return-1;
			var tBoneData;
			for (var i=0;i < this.bones.length;i++){
				tBoneData=this.bones[i];
				if (tBoneData.name==boneName)return i;
			}
			return-1;
		}

		__proto.findBone=function(boneName){
			if (boneName==null)return null;
			var tBoneData;
			for (var i=0;i < this.bones.length;i++){
				tBoneData=this.bones[i];
				if (tBoneData.name==boneName)return tBoneData;
			}
			return null;
		}

		__proto.findSkin=function(skinName){
			if (skinName==null)return null;
			var tSkin;
			for (var i=0;i < this.skins.length;i++){
				tSkin=this.skins[i];
				if (tSkin.name==skinName){
					return tSkin;
				}
			}
			return null;
		}

		__proto.findSlotIndex=function(slotName){
			for (var i=0;i < this.slots.length;i++){
				if (this.slots[i].name==slotName)return i;
			}
			return-1;
		}

		__proto.findSlot=function(slotName){
			for (var i=0;i < this.slots.length;i++){
				if (this.slots[i].name==slotName)return this.slots[i];
			}
			return null;
		}

		__proto.findIkConstraint=function(constraintName){
			if (constraintName==null)return null;
			var tIkConstraintData;
			for (var i=0;i < this.ikConstraints.length;i++){
				tIkConstraintData=this.ikConstraints[i];
				if (tIkConstraintData.name==constraintName){
					return tIkConstraintData;
				}
			}
			return null;
		}

		__proto.findPathConstraintIndex=function(pathConstraintName){
			if (pathConstraintName==null)console.log("pathConstraintName cannot be null.");
			var pathConstraints=this.pathConstraints;
			for (var i=0,n=pathConstraints.length;i < n;i++){
				if (pathConstraints[i].name==pathConstraintName)return i;
			}
			return-1;
		}

		__proto.findEvent=function(eventName){
			var tEventData;
			for (var i=0;i < this.events.length;i++){
				tEventData=this.events[i];
				if (eventName==tEventData.name){
					return tEventData;
				}
			}
			return null;
		}

		return SkeletonData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.Skin
	var Skin=(function(){
		function Skin(){
			this.name=null;
			this._attachments=[];
		}

		__class(Skin,'Spine.Skin');
		var __proto=Skin.prototype;
		__proto.addAttachment=function(slotIndex,name,attachment){
			var tDictionary;
			tDictionary=this._attachments[slotIndex];
			if (!tDictionary){
				tDictionary=new Object();
				this._attachments[slotIndex]=tDictionary;
			}
			tDictionary[name]=attachment;
		}

		__proto.getAttachment=function(slotIndex,name){
			if (slotIndex >=this._attachments.length)return null;
			var dictionary=this._attachments[slotIndex];
			return dictionary?dictionary[name]:null;
		}

		return Skin;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.SlotAniData
	var SlotAniData=(function(){
		function SlotAniData(){
			this.mMaxTime=0;
			this.mPreAm=1;
			this.mPreDisplay=0;
			this.mPreAmIndex=0;
			this.mPreDisplayIndex=0;
			this.mDataList=[];
			this.mTimeList=[];
		}

		__class(SlotAniData,'Spine.SlotAniData');
		var __proto=SlotAniData.prototype;
		__proto.addData=function(time,type,data){
			var tDBAniSlotFrameData;
			if (this.mTimeList.length==0){
				this.mMaxTime=time;
				this.mTimeList.push(time);
				tDBAniSlotFrameData=new DBAniSlotFrameData();
				this.mergeData(tDBAniSlotFrameData,type,data,0);
				this.mDataList.push(tDBAniSlotFrameData);
				return;
			};
			var i=0,n=0;
			var tAddKey=true;
			for (i=0,n=this.mTimeList.length;i < n;i++){
				if (this.mTimeList[i]==time){
					tAddKey=false;
					tDBAniSlotFrameData=this.mDataList[i];
					this.mergeData(tDBAniSlotFrameData,type,data,i,false);
					break ;
				}
			}
			if (tAddKey){
				if (time > this.mMaxTime){
					this.mMaxTime=time;
					this.mTimeList.push(time);
					tDBAniSlotFrameData=new DBAniSlotFrameData();
					this.mergeData(tDBAniSlotFrameData,type,data,this.mTimeList.length-1);
					this.mDataList.push(tDBAniSlotFrameData);
					}else {
					var tTime=0;
					for (i=0,n=this.mTimeList.length;i < n;i++){
						tTime=this.mTimeList[i];
						if (time < tTime){
							this.mTimeList.splice(i,0,time);
							tDBAniSlotFrameData=new DBAniSlotFrameData();
							this.mDataList.splice(i,0,tDBAniSlotFrameData);
							this.mergeData(tDBAniSlotFrameData,type,data,i);
							break ;
						}
					}
				}
			}
		}

		//只有两种，且是有先后顺序，所以只用处理第二种就行了
		__proto.mergeData=function(frameData,type,data,index,createKey){
			(createKey===void 0)&& (createKey=true);
			if (createKey){
				if (index > 0){
					var tPreFrameData=this.mDataList[index-1];
					frameData.aM=tPreFrameData.aM;
					frameData.displayIndex=tPreFrameData.displayIndex;
				}
			};
			var i=0;
			var tFrameData;
			switch(type){
				case "color":
					frameData.aM=data[3];
					for (i=index;i < this.mDataList.length;i++){
						tFrameData=this.mDataList [i];
						tFrameData.aM=data[3];
					}
					for (i=this.mPreAmIndex;i < index;i++){
						tFrameData=this.mDataList [i];
						if (!tFrameData.aMKey){
							tFrameData.aMKey=true;
							tFrameData.aM=this.mPreAm;
						}
					}
					this.mPreAmIndex=index+1;
					this.mPreAm=frameData.aM;
					break ;
				case "attachment":
					frameData.displayIndex=data[0];
					for (i=index;i < this.mDataList.length;i++){
						tFrameData=this.mDataList [i];
						tFrameData.displayIndex=data[0];
					}
					for (i=this.mPreDisplayIndex;i < index;i++){
						tFrameData=this.mDataList [i];
						if (!tFrameData.displayIndexKey){
							tFrameData.displayIndexKey=true;
							tFrameData.displayIndex=this.mPreDisplay;
						}
					}
					this.mPreDisplayIndex=index+1;
					this.mPreDisplay=frameData.displayIndex;
					break ;
				}
		}

		return SlotAniData;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.SlotData
	var SlotData=(function(){
		function SlotData(){
			this.name=null;
			this.boneName=null;
			this.boneData=null;
			this.r=1;
			this.g=1;
			this.b=1;
			this.a=1;
			this.attachmentName=null;
			this.blendMode=null;
			this.skin=null;
			this.attachment=null;
			this.attachmentTime=0;
			this.attachmentVertices=[];
		}

		__class(SlotData,'Spine.SlotData');
		return SlotData;
	})()


	/**
	*...
	*@author ww
	*/
	//class Spine.SpineFileAdpter
	var SpineFileAdpter=(function(){
		function SpineFileAdpter(){
			this.boneDic=null;
			this.skinDic=null;
			this.slotDic=null;
		}

		__class(SpineFileAdpter,'Spine.SpineFileAdpter');
		var __proto=SpineFileAdpter.prototype;
		__proto.initBoneDic=function(bones){
			this.boneDic={};
			if (!bones)
				return;
			var i=0,len=0;
			len=bones.length;
			var tBone;
			for (i=0;i < len;i++){
				tBone=bones[i];
				this.boneDic[tBone.name]=tBone;
			}
		}

		__proto.initSkinDic=function(skins){
			this.skinDic={};
			if (!skins)return;
			this.skinDic=skins;
		}

		__proto.initSlotDic=function(slots){
			this.slotDic={};
			if (!slots)return;
			var i=0,len=0;
			len=slots.length;
			var tSlotData;
			for (i=0;i < len;i++){
				tSlotData=slots[i];
				this.slotDic[tSlotData.name]=slots[i];
			}
		}

		//slotDic=slots;
		__proto.getObjValue=function(obj,keys){
			var i=0,len=0;
			len=keys.length;
			for (i=0;i < len;i++){
				obj=obj[keys[i]];
				if (!obj)return obj;
			}
			return obj;
		}

		__proto.adptSpineFile=function(spineData){
			//debugger;
			this.initBoneDic(spineData.bones);
			this.initSkinDic(spineData.skins);
			this.initSlotDic(spineData.slots);
			this.dealAnimations(spineData.animations);
		}

		__proto.dealAnimations=function(animations){
			var key;
			for (key in animations){
				this.dealAnimation(animations[key]);
			}
		}

		__proto.dealAnimation=function(animationO){
			this.dealAnimationBones(animationO.bones);
			this.dealAnimationSlots(animationO.slots);
		}

		__proto.dealAnimationSlots=function(slots){
			if (!slots)return;
			var tSlotName;
			for (tSlotName in slots){
				this.dealAnimationSlot(slots[tSlotName],tSlotName);
			}
		}

		__proto.dealAnimationSlot=function(slotAni,slotName){
			if (!slotAni)return;
			if (!slotAni["attachment"])slotAni["attachment"]=[];
			var attachArr;
			attachArr=slotAni["attachment"];
			if (attachArr[0] && attachArr[0].time==0)return;
			var slotData;
			slotData=this.slotDic[slotName];
			var tAttachName;
			if (!slotData || !slotData["attachment"]){
				tAttachName="";
				}else{
				tAttachName=slotData["attachment"];
			};
			var slotAniO;
			slotAniO={};
			slotAniO.time=0;
			slotAniO.name=tAttachName;
			slotAniO.isAdd=true;
			attachArr.unshift(slotAniO);
		}

		//slotAni["attachment"]=[slotAniO];
		__proto.dealAnimationDeform=function(deform){
			if (!deform)return;
			var skinName;
			for (skinName in deform){
				this.dealAnimationSkinDeform(skinName,deform[skinName]);
			}
		}

		__proto.dealAnimationSkinDeform=function(skin,deform){
			var slotName;
			var picName;
			var tSlotO;
			for (slotName in deform){
				tSlotO=deform[slotName];
				for (picName in tSlotO){
					this.dealPicAni(tSlotO[picName],[skin,slotName,picName])
				}
			}
		}

		__proto.dealPicAni=function(frameList,keys){
			var skinO;
			skinO=this.getObjValue(this.skinDic,keys);
			if (!skinO){
				return;
			};
			var aniKeys;
			aniKeys={};
			var i=0,len=0;
			len=frameList.length;
			var tKey;
			var tFrame;
			for (i=0;i < len;i++){
				tFrame=frameList[i];
				for (tKey in tFrame){
					if (tKey=="time")continue ;
					if (tKey=="curve")continue ;
					if (tKey=="offset")continue ;
					aniKeys[tKey]=true;
				}
			};
			var preData;
			for (tKey in aniKeys){
				console.log("addKey:",tKey);
				preData=skinO[tKey];
				if (!preData)continue ;
				len=frameList.length;
				for (i=0;i < len;i++){
					tFrame=frameList[i];
					if (!tFrame[tKey]&&tFrame.time==0){
						tFrame[tKey]=preData;
					}
				}
			}
		}

		__proto.dealAnimationBones=function(bones){
			if (!bones)
				return;
			var boneName;
			for (boneName in bones){
				this.dealBone(bones[boneName],boneName);
			}
		}

		__proto.createBoneDefaultFrame=function(type,boneName){
			var method;
			method=SpineFileAdpter.CreateMethod[type];
			var boneData;
			boneData=this.boneDic[boneName];
			if (!method || !boneData){
				return null;
			};
			var rst={};
			var i=0,len=0;
			var key;
			len=method.length;
			var dataKey;
			for (i=0;i < len;i+=2){
				dataKey=method[i];
				key=method[i+1];
				if (!boneData[key]){
					rst[dataKey]=SpineFileAdpter.DefaultValues[key];
					}else{
					rst[dataKey]=SpineFileAdpter.DefaultValues[key];
				}
			}
			rst.curve="stepped";
			rst.time=0;
			return rst;
		}

		__proto.dealBone=function(bone,boneName){
			var type;
			var i=0,len=0;
			len=SpineFileAdpter.BoneKeys.length;
			for (i=0;i < len;i++){
				type=SpineFileAdpter.BoneKeys[i];
				if (!bone[type]){
					bone[type]=[];
				};
				var tArr;
				tArr=bone[type];
				if (!tArr[0] || tArr[0].time !=0){
					var tAni;
					tAni=this.createBoneDefaultFrame(type,boneName);
					if (tAni){
						tArr.unshift(tAni);
					}
				}
			}
			for (type in bone){
				this.dealFrameList(bone[type],type);
			}
		}

		__proto.dealFrameList=function(frames,type){}
		__static(SpineFileAdpter,
		['I',function(){return this.I=new SpineFileAdpter();},'BoneKeysST',function(){return this.BoneKeysST=["x","y","rotation","scaleX","scaleY","shearX","shearY"];},'DefaultValues',function(){return this.DefaultValues={"x":0,"y":0,"rotation":0,"scaleX":1,"scaleY":1,"shearX":0,"shearY":0};},'BoneKeys',function(){return this.BoneKeys=["rotate","translate","scale","shear"];},'CreateMethod',function(){return this.CreateMethod={"rotate":["angle","rotation"],"translate":["x","x","y","y"],"scale":["x","scaleX","y","scaleY"],"shear":["x","shearX","y","shearY"]};}
		]);
		return SpineFileAdpter;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.SpineIkConstraintData
	var SpineIkConstraintData=(function(){
		function SpineIkConstraintData(){
			this.name=null;
			this.targetBoneName=null;
			this.targetBoneIndex=-1;
			this.bendDirection=1;
			this.mix=1;
			this.time=0;
			this.duration=0;
			this.boneNames=[];
			this.boneIndexs=[];
		}

		__class(SpineIkConstraintData,'Spine.SpineIkConstraintData');
		var __proto=SpineIkConstraintData.prototype;
		__proto.copy=function(){
			var tData=new SpineIkConstraintData();
			tData.name=this.name;
			tData.bendDirection=this.bendDirection;
			tData.mix=this.mix;
			tData.time=this.time;
			return tData;
		}

		__proto.getData=function(){
			return [this.bendDirection,this.mix,0,0,0,0];
		}

		return SpineIkConstraintData;
	})()


	/**
	*...
	*@author ...
	*/
	//class Spine.SpineTimeline
	var SpineTimeline=(function(){
		function SpineTimeline(){
			this.boneIndex=-1;
			this.frames=null;
			this.frames=[];
		}

		__class(SpineTimeline,'Spine.SpineTimeline');
		var __proto=SpineTimeline.prototype;
		__proto.setFrame=function(frameIndex,time,angle){
			frameIndex *=2;
			this.frames[frameIndex]=time;
			this.frames[frameIndex+1]=angle;
		}

		__proto.apply=function(skeleton,time){
			if (time < this.frames[0])
				return;
			var bone;
			var amount=NaN;
		}

		return SpineTimeline;
	})()


	/**
	*...
	*@author
	*/
	//class Spine.TransformConstraintData
	var TransformConstraintData=(function(){
		function TransformConstraintData(){
			this.name=null;
			this.target=0;
			this.rotateMix=NaN;
			this.translateMix=NaN;
			this.scaleMix=NaN;
			this.shearMix=NaN;
			this.offsetRotation=NaN;
			this.offsetX=NaN;
			this.offsetY=NaN;
			this.offsetScaleX=NaN;
			this.offsetScaleY=NaN;
			this.offsetShearY=NaN;
			this.boneIndexs=[];
		}

		__class(TransformConstraintData,'Spine.TransformConstraintData');
		return TransformConstraintData;
	})()


	/**
	*遗留问题：
	*1.动画帧之间的插值方式现在还没实现
	*2.骨骼动画还没
	*@author ...
	*/
	//class testTools
	var testTools=(function(){
		function testTools(){
			this.versionPath="version4.5/";
			this.DBFileName="QQ";
			this.mTools=null;
			this.DBFileName="gpqg";
			this.DBFileName="ytj";
			this.DBFileName="hou";
			this.mTools=new BoneAniTools();
			this.DBFileName="Bicycle";
			this.DBFileName="NewProject";
			this.DBFileName="TestRo";
			this.mTools.tExType=2;
			this.mTools.testLoaderFile(0,this.DBFileName,this.versionPath+this.DBFileName,this,this.complete,this.fail);
			DragonBoneTools;
		}

		__class(testTools,'testTools');
		var __proto=testTools.prototype;
		__proto.complete=function(name,data){
			var text=data;
			var name=this.DBFileName+".sk";
			var javascriptString="";
			javascriptString+="window.URL = window.URL || window.webkitURL;";
			javascriptString+="var a = document.createElement('a');";
			javascriptString+="var file = new Blob([text], {type: 'application/octet-stream'});";
			javascriptString+="a.href = window.URL.createObjectURL(file);";
			javascriptString+="a.download = name;";
			javascriptString+="window.document.body.appendChild(a);";
			javascriptString+="a.click();";
			eval(javascriptString);
		}

		__proto.fail=function(msg){
			console.log(msg);
		}

		return testTools;
	})()


	//class dragonBones.BoneAniTools extends Tools
	var BoneAniTools=(function(_super){
		function BoneAniTools(){
			this.mTexturePath=null;
			this.mTextureJsonPath=null;
			this.mSkeletonJsonPath=null;
			this.mSaveAniPath=null;
			this.mSaveTexturePath=null;
			this.mTexture=null;
			this.mTextureJson=null;
			this.mSkeletonJson=null;
			this.versionPath="version4.5";
			this.DBFileName="man";
			this.mCompleteFun=null;
			this.mFailFun=null;
			this.mSpineFactory=null;
			this.mDBFactory=null;
			this.mDBTools=null;
			this.mNodePath=null;
			this.tExType=0;
			this.mTexturePathList=null;
			BoneAniTools.__super.call(this);
			if (Laya.stage==null){
				Laya.init(1,1);
			}
		}

		__class(BoneAniTools,'dragonBones.BoneAniTools',_super);
		var __proto=BoneAniTools.prototype;
		__proto.loadFile=function(nodePath,dbTools,path,outPath,completeFun,failFun,type,eType,tDBFileName){
			(type===void 0)&& (type=0);
			(eType===void 0)&& (eType=0);
			this.mNodePath=nodePath;
			this.mDBTools=dbTools;
			BoneAniTools.mBoneToolsKey=true;
			this.mFactoryType=type;
			var fileName;
			this.DBFileName=tDBFileName||nodePath.basename(path).split(".")[0];
			this.versionPath=path;
			this.mCompleteFun=completeFun;
			this.mFailFun=failFun;
			Laya.loader.on("error",this,this.onError)
			this.tExType=eType;
			switch(type){
				case 0:
					if (eType==2){
						this.mTexturePath=nodePath.join(this.versionPath,this.DBFileName+"_tex.png");
						this.mTextureJsonPath=nodePath.join(this.versionPath,this.DBFileName+"_tex.json");
						this.mSkeletonJsonPath=nodePath.join(this.versionPath,this.DBFileName+"_ske.json");
						}else{
						this.mTexturePath=nodePath.join(this.versionPath,"texture.png");
						this.mTextureJsonPath=nodePath.join(this.versionPath,"texture.json");
						this.mSkeletonJsonPath=nodePath.join(this.versionPath,this.DBFileName+".json");
					}
					this.mSaveAniPath=nodePath.join(outPath,this.DBFileName+".sk");
					this.mSaveTexturePath=outPath;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
					{url:this.mTextureJsonPath,type:"json" },
					{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded),null,null,1,true);
					break ;
				case 1:
					this.mTexturePath=nodePath.join(this.versionPath,this.DBFileName+".png");
					this.mTextureJsonPath=nodePath.join(this.versionPath,this.DBFileName+".atlas");
					this.mSkeletonJsonPath=nodePath.join(this.versionPath,this.DBFileName+".json");
					this.mSaveAniPath=nodePath.join(outPath,this.DBFileName+".sk");
					this.mSaveTexturePath=outPath;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
					{url:this.mTextureJsonPath,type:"text" },
					{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded),null,null,1,true);
					break ;
				}
		}

		__proto.testLoaderFile=function(type,name,path,dbTools,completeFun,failFun){
			this.mDBTools=dbTools;
			this.mFactoryType=type;
			var fileName;
			this.DBFileName=name;
			this.versionPath=path;
			this.mCompleteFun=completeFun;
			this.mFailFun=failFun;
			Laya.loader.on("error",this,this.onError)
			switch(type){
				case 0:
					if (this.tExType==2){
						this.mTexturePath=this.versionPath+"/"+this.DBFileName+"_tex.png";
						this.mTextureJsonPath=this.versionPath+"/"+this.DBFileName+"_tex.json";
						this.mSkeletonJsonPath=this.versionPath+"/"+this.DBFileName+"_ske.json";
						}else{
						this.mTexturePath=this.versionPath+"/texture.png";
						this.mTextureJsonPath=this.versionPath+"/texture.json";
						this.mSkeletonJsonPath=this.versionPath+"/"+this.DBFileName+".json";
					}
					this.mSaveAniPath=this.versionPath+this.DBFileName;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
					{url:this.mTextureJsonPath,type:"json" },
					{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded));
					break ;
				case 1:
					this.mTexturePath=this.versionPath+"/"+this.DBFileName+".png";
					this.mTextureJsonPath=this.versionPath+"/"+this.DBFileName+".atlas";
					this.mSkeletonJsonPath=this.versionPath+"/"+this.DBFileName+".json";
					this.mSaveAniPath=this.versionPath+this.DBFileName;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
					{url:this.mTextureJsonPath,type:"text" },
					{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded));
					break ;
				}
		}

		__proto.onError=function(err){
			var tErrInfo="---"+this.DBFileName+"---"+"加载错误:"+err;
			if (this.mFailFun !=null){
				this.mFailFun.call(this.mDBTools,tErrInfo);
				this.clear();
			}
		}

		__proto.onErrorVersion=function(ver){
			var msg;
			switch(this.mFactoryType){
				case 0:
					msg="DragonBone支持版本为:"+"4.5"+"~"+"5.1.0"+""+"当前文件版本为"+ver;
					break ;
				case 1:
					msg="Spine支持版本为:"+"3.4.0.2"+"~"+"3.6.16"+""+"当前文件版本为"+ver;
					break ;
				}
			if (this.mFailFun !=null){
				msg+="\n动画结果可能不正确:"+this.mSkeletonJsonPath;
				this.mFailFun.call(this.mDBTools,msg);
			}
		}

		__proto.onLoaded=function(){
			this.mTexture=Loader.getRes(this.mTexturePath);
			this.mTextureJson=Loader.getRes(this.mTextureJsonPath);
			this.mSkeletonJson=Loader.getRes(this.mSkeletonJsonPath);
			var tVer;
			tVer=this.getSkeletonVersion(this.mSkeletonJson,this.mFactoryType);
			if (!this.isSkeletonVersionOK(tVer,this.mFactoryType)){
				this.onErrorVersion(tVer);
			}
			switch(this.mFactoryType){
				case 0:
					this.loadComplete();
					break ;
				case 1:
					try {
						var tAtlas=new Atlas();
						this.mTexturePathList=tAtlas.preInit(this.mTextureJson);
						var tLoadList=[];
						var tObject;
						var tPath;
						for (var i=0;i < this.mTexturePathList.length;i++){
							tPath=this.join(this.versionPath,this.mTexturePathList[i]);
							tObject={url:tPath,type:"image" };
							tLoadList.push(tObject);
						}
						Laya.loader.load(tLoadList,Handler.create(this,this.loadComplete));
						}catch (e){
						this.onError("纹理头解析出错:"+e);
					}
					break ;
				}
		}

		__proto.getSkeletonVersion=function(dataO,type){
			var ver;
			var verNum=NaN;
			var isOk=false;
			switch(type){
				case 0:
					ver=dataO.version;
					verNum=BoneAniTools.getVerNum(ver);
					isOk=verNum >=BoneAniTools.MinDragonNum && verNum <=BoneAniTools.MaxDragonNum;
					break ;
				case 1:
					ver=dataO.skeleton.spine;
					verNum=BoneAniTools.getVerNum(ver);
					isOk=verNum >=BoneAniTools.MinSpineNum && verNum <=BoneAniTools.MaxSpineNum;
					break ;
				}
			console.log("skeletonVer:",ver,isOk);
			return ver;
		}

		__proto.isSkeletonVersionOK=function(ver,type){
			var isOk=false;
			var verNum=NaN;
			switch(type){
				case 0:
					verNum=BoneAniTools.getVerNum(ver);
					isOk=verNum >=BoneAniTools.MinDragonNum && verNum <=BoneAniTools.MaxDragonNum;
					break ;
				case 1:
					verNum=BoneAniTools.getVerNum(ver);
					isOk=verNum >=BoneAniTools.MinSpineNum && verNum <=BoneAniTools.MaxSpineNum;
					break ;
				}
			return isOk;
		}

		__proto.loadComplete=function(){
			var tTextureName;
			var i=0;
			try {
				switch(this.mFactoryType){
					case 0:
						this.mDBFactory=new LayaFactory()
						this.mDBFactory.on("complete",this,this.onCompleteHandler);
						this.mDBFactory.parseData(this.mTexture,this.mTextureJson,this.mSkeletonJson,this.DBFileName+".png");
						break ;
					case 1:
						this.mSpineFactory=new SpineFactory();
						this.mSpineFactory.on("complete",this,this.onCompleteHandler);
						var tTextureMap={};
						var tTexture;
						for (i=0;i < this.mTexturePathList.length;i++){
							tTextureName=this.mTexturePathList[i];
							tTexture=Loader.getRes(this.join(this.versionPath,tTextureName));
							tTextureMap[tTextureName]=tTexture;
						}
						this.mSpineFactory.parseData(tTextureMap,this.mTextureJson,this.mSkeletonJson);
						break ;
					}
				}catch (e){
				this.onError("解析文件出错:"+e);
			}
		}

		__proto.onCompleteHandler=function(){
			var testLayaAnimation=new TestLayaAnimation();
			var tLayaAni;
			var stringJSON;
			try {
				switch(this.mFactoryType){
					case 0:
						tLayaAni=testLayaAnimation.getLayaBoneAni(this.mDBFactory.mArmatureArr,this.mDBFactory.mDBTextureDataArray,"Dragon");
						break ;
					case 1:
						tLayaAni=testLayaAnimation.getLayaBoneAni(this.mSpineFactory.mSkeletonData.mArmatureArr,this.mSpineFactory.mDBTextureDataArray);
						break ;
					}
				}catch (e){
				this.onError("组织数据出错:"+e);
			}
			try {
				var buffer=this.getObjectBuffer(tLayaAni);
				}catch (e){
				this.onError("导出二进制数据出错:"+e);
			}
			this.save(this.mSaveAniPath,buffer);
		}

		//保存文件
		__proto.save=function(filename,dataView){
			var tTextureList=[];
			var tTextureOutList=[];
			try {
				if (BoneAniTools.mBoneToolsKey){
					var tTextureName;
					switch(this.mFactoryType){
						case 0:
							if (this.tExType==2){
								tTextureList.push(this.join(this.versionPath,this.DBFileName+"_tex.png"));
								}else{
								tTextureList.push(this.join(this.versionPath,"texture.png"));
							}
							tTextureOutList.push(this.join(this.mSaveTexturePath,this.DBFileName+".png"));
							break ;
						case 1:
							for (var i=0;i < this.mTexturePathList.length;i++){
								tTextureName=this.mTexturePathList[i];
								tTextureList.push(this.join(this.versionPath,tTextureName));
								tTextureOutList.push(this.join(this.mSaveTexturePath,tTextureName));
							}
							break ;
						}
				}
				}catch (e){
				this.onError("清除loader资源出错:"+e);
			}
			this.mCompleteFun.call(this.mDBTools,filename,dataView,tTextureList,tTextureOutList);
		}

		__proto.clear=function(){
			try {
				if (BoneAniTools.mBoneToolsKey){
					Loader.clearRes(this.mTexturePath);
					Loader.clearRes(this.mTextureJsonPath);
					Loader.clearRes(this.mSkeletonJsonPath);
					var tTextureName;
					if (this.mTexturePathList){
						switch(this.mFactoryType){
							case 1:
								for (var i=0;i < this.mTexturePathList.length;i++){
									tTextureName=this.mTexturePathList[i];
									Loader.clearRes(this.join(this.versionPath,tTextureName));
								}
								break ;
							}
						this.mTexturePathList.length=0;
					}
				}
				}catch (e){
				this.onError("清除loader资源出错:"+e);
			}
		}

		__proto.join=function(str1,str2){
			var tOut;
			if (this.mNodePath){
				tOut=this.mNodePath.join(str1,str2);
				}else {
				tOut=str1+"/"+str2;
			}
			return tOut;
		}

		__getset(1,BoneAniTools,'SpineTip',function(){
			return BoneAniTools.getVersionTip("3.4.0.2","3.6.16");
		},Tools._$SET_SpineTip);

		__getset(1,BoneAniTools,'DragonBoneTip',function(){
			return BoneAniTools.getVersionTip("4.5","5.1.0");
		},Tools._$SET_DragonBoneTip);

		BoneAniTools.getVersionTip=function(min,max){
			return "("+min+"~"+max+")";
		}

		BoneAniTools.getVerNum=function(ver){
			var nums;
			nums=ver.split(".");
			var i=0,len=0;
			len=nums.length;
			var rst=NaN;
			rst=0;
			var tWeight=NaN;
			tWeight=1;
			var tValue=NaN;
			for (i=0;i < len;i++){
				tValue=parseInt(nums[i]);
				if (isNaN(tValue)){
					tValue=0;
				}
				rst+=tValue *tWeight;
				tWeight *=0.01;
			}
			return rst;
		}

		BoneAniTools.mBoneToolsKey=false;
		BoneAniTools.MinSpine="3.4.0.2";
		BoneAniTools.MaxSpine="3.6.16";
		BoneAniTools.MinDragon="4.5";
		BoneAniTools.MaxDragon="5.1.0";
		__static(BoneAniTools,
		['MinSpineNum',function(){return this.MinSpineNum=BoneAniTools.getVerNum("3.4.0.2");},'MaxSpineNum',function(){return this.MaxSpineNum=BoneAniTools.getVerNum("3.6.16");},'MinDragonNum',function(){return this.MinDragonNum=BoneAniTools.getVerNum("4.5");},'MaxDragonNum',function(){return this.MaxDragonNum=BoneAniTools.getVerNum("5.1.0");}
		]);
		return BoneAniTools;
	})(Tools)


	/**
	*...
	*@author ...
	*/
	//class dragonBones.LayaFactory extends laya.events.EventDispatcher
	var LayaFactory=(function(_super){
		function LayaFactory(){
			this.mTexture=null;
			this.mSubTextureArr=null;
			this.mSubTextureDic={};
			this.mArmatureDic={};
			this.mSlotDic={};
			this.mDisplay=null;
			this.mDBTextureDataDic={};
			LayaFactory.__super.call(this);
			this.mArmatureArr=[];
			this.mDBTextureDataArray=[];
		}

		__class(LayaFactory,'dragonBones.LayaFactory',_super);
		var __proto=LayaFactory.prototype;
		__proto.parseData=function(texture,textureJson,skeletonJson,textName){
			this.mTexture=texture;
			var tJsonData=textureJson;
			this.mSubTextureArr=[];
			var tSubTextureArr=tJsonData.SubTexture;
			var tSubTexture;
			var tDBTextureData
			if (tSubTextureArr){
				var tSubTextureData=null;
				var tX=0;
				var tY=0;
				var tWidth=0;
				var tHeight=0;
				var tFrameX=0;
				var tFrameY=0;
				var tFrameWidth=0;
				var tFrameHeight=0;
				var tName;
				for (var i=0,n=tSubTextureArr.length;i < n;i++){
					tSubTextureData=tSubTextureArr[i];
					tDBTextureData=new DBTextureData();
					tDBTextureData.x=tX=tSubTextureData.x;
					tDBTextureData.y=tY=tSubTextureData.y;
					tDBTextureData.w=tWidth=tSubTextureData.width;
					tDBTextureData.h=tHeight=tSubTextureData.height;
					tDBTextureData.frameX=tFrameX=tSubTextureData.frameX;
					tDBTextureData.frameY=tFrameY=tSubTextureData.frameY;
					tDBTextureData.frameW=tFrameWidth=tSubTextureData.frameWidth;
					tDBTextureData.frameH=tFrameHeight=tSubTextureData.frameHeight;
					tDBTextureData.name=tName=tSubTextureData.name;
					tDBTextureData.textureSrc=textName;
					this.mDBTextureDataArray.push(tDBTextureData);
					this.mDBTextureDataDic[tName]=tDBTextureData;
					tSubTexture=Texture.create(this.mTexture,tX,tY,tWidth,tHeight,-tFrameX,-tFrameY,tFrameWidth,tFrameHeight);
					this.mSubTextureArr.push(tSubTexture);
					this.mSubTextureDic[tName]=tSubTexture;
				}
			}
			this.skeletonComplete(skeletonJson);
		}

		__proto.skeletonComplete=function(e){
			var i=0,j=0,l=0,k=0,m=0,z=0;
			var tFrameRate=e.frameRate;
			var tArmatureData;
			var tArmatureDataArr=e.armature;
			var tDBTextureData;
			for (i=0;i < tArmatureDataArr.length;i++){
				tArmatureData=tArmatureDataArr[i];
				if (tArmatureData){
					var tArmature=new DBArmatureData();
					tArmature.name=tArmatureData.name;
					tArmature.type=tArmatureData.type;
					tArmature.frameRate=tArmatureData.frameRate;
					tArmature.onFrameTime=1000 / tArmature.frameRate;
					this.mArmatureDic[tArmature.name]=tArmature;
					this.mArmatureArr.push(tArmature);
					var tMyBoneData;
					var tBoneData;
					var tBoneDataArr=tArmatureData.bone;
					for (j=0;j < tBoneDataArr.length;j++){
						tBoneData=tBoneDataArr[j];
						tMyBoneData=new DBBoneData();
						tMyBoneData.initData(tBoneData);
						tMyBoneData.transform=this.parseTransform(tBoneData.transform);
						tArmature.boneArr.push(tMyBoneData);
					};
					var tBoneSlotData;
					var tBoneSlotDataArr;
					tBoneSlotDataArr=tArmatureData.slot;
					for (j=0;j < tBoneSlotDataArr.length;j++){
						tBoneSlotData=tBoneSlotDataArr[j];
						if (tBoneSlotData){
							var tMyBoneSlotData=new DBBoneSlotData();
							tMyBoneSlotData.initData(tBoneSlotData);
							tArmature.slotArr.push(tMyBoneSlotData);
						}
					};
					var tSkinData;
					var tSkinArray=tArmatureData.skin;
					var tDBSlotData;
					var tDBSkinSlotDisplayData;
					var tTexture;
					if (tSkinArray){
						var tMySkinData;
						for (j=0;j < tSkinArray.length;j++){
							tSkinData=tSkinArray[j];
							tMySkinData=new DBSkinData();
							tMySkinData.initData(tSkinData,tArmature);
							for (l=0;l < tMySkinData.slotArr.length;l++){
								tDBSlotData=tMySkinData.slotArr[l];
								for (k=0;k < tDBSlotData.displayArr.length;k++){
									tDBSkinSlotDisplayData=tDBSlotData.displayArr[k];
									tDBTextureData=this.mDBTextureDataDic[tDBSkinSlotDisplayData.name];
									tTexture=this.mSubTextureDic[tDBTextureData.name];
									for (m=0;m < tDBSkinSlotDisplayData.uvs.length;m+=2){
										var tU=tTexture.uv[2]-tTexture.uv[0];
										var tV=tTexture.uv[7]-tTexture.uv[1];
										tDBSkinSlotDisplayData.uvs[m]=tTexture.uv[0]+tDBSkinSlotDisplayData.uvs[m] *tU;
										tDBSkinSlotDisplayData.uvs[m+1]=tTexture.uv[1]+tDBSkinSlotDisplayData.uvs[m+1] *tV;
									}
									if (tDBTextureData){
										if (tDBTextureData.frameW){
											tDBSkinSlotDisplayData.width=tDBTextureData.frameW;
											}else {
											tDBSkinSlotDisplayData.width=tDBTextureData.w;
										}
										if (tDBTextureData.frameH){
											tDBSkinSlotDisplayData.height=tDBTextureData.frameH;
											}else {
											tDBSkinSlotDisplayData.height=tDBTextureData.h;
										}
									}
								}
							}
							tArmature.skinArr.push(tMySkinData);
							if (j==0){
								tArmature.defaultSkin=tMySkinData;
							}
						}
					};
					var tIkConstraintData;
					var tIkData;
					var tIkDataArr=tArmatureData.ik;
					for (j=0;j < tIkDataArr.length;j++){
						tIkData=tIkDataArr[j];
						tIkConstraintData=new SpineIkConstraintData();
						tIkConstraintData.name=tIkData.name;
						if (tIkData.bone){
							var tDBBoneData=tArmature.findBone(tIkData.bone);
							var tChain=tIkData.chain;
							while (tChain > 0){
								tChain--;
								if (tDBBoneData && tDBBoneData.parent){
									tIkConstraintData.boneNames.push(tDBBoneData.parent);
									tDBBoneData=tArmature.findBone(tDBBoneData.parent);
								}
							}
							tIkConstraintData.boneNames.push(tIkData.bone);
						}
						if (tIkConstraintData.boneNames && tIkConstraintData.boneNames.length > 0){
							for (l=0;l < tIkConstraintData.boneNames.length;l++){
								tIkConstraintData.boneIndexs.push(tArmature.findBoneIndex(tIkConstraintData.boneNames[l]));
							}
						}
						tIkConstraintData.targetBoneName=tIkData.target;
						if (tIkConstraintData.targetBoneName){
							tIkConstraintData.targetBoneIndex=tArmature.findBoneIndex(tIkConstraintData.targetBoneName);
						}
						if (tIkData.bendPositive !=undefined){
							if (tIkData.bendPositive=="true"){
								tIkConstraintData.bendDirection=1;
								}else {
								tIkConstraintData.bendDirection=0;
							}
						}
						if (tIkData.weight){
							tIkConstraintData.mix=tIkData.weight;
						}
						tArmature.ikArr.push(tIkConstraintData);
					};
					var tDbSkinSlotDisplayData;
					var tAnimationData;
					var tAnimationDataArr=tArmatureData.animation;
					for (j=0;j < tAnimationDataArr.length;j++){
						tAnimationData=tAnimationDataArr[j];
						var tMyAnimationData=new DBAnimationData();
						tMyAnimationData.initData(tAnimationData,tArmature);
						var tAniFfdData;
						var tFfdData;
						var tFfdDataArr=tAnimationData.ffd;
						for (l=0;l < tFfdDataArr.length;l++){
							tFfdData=tFfdDataArr[l];
							tAniFfdData=new DBAniFfdData();
							tAniFfdData.name=tFfdData.name;
							tAniFfdData.skin=tArmature.findSkin(tFfdData.skin);
							tAniFfdData.slot=tAniFfdData.skin.getDBSlotData(tFfdData.slot);
							var tDisplay=tAniFfdData.slot.findDisplay(tAniFfdData.name);
							var tFfdFrameData;
							var tFrameData;
							var tFrameDataArr=tFfdData.frame;
							for (k=0;k < tFrameDataArr.length;k++){
								tFfdFrameData=new DBAniFfdFrameData();
								tAniFfdData.frame.push(tFfdFrameData);
								tFrameData=tFrameDataArr[k];
								tFfdFrameData.duration=tFrameData.duration;
								tFfdFrameData.tweenEasing=tFrameData.tweenEasing;
								var tCurveArr=tFrameData.curve;
								if (tCurveArr){
									for (m=0;m < tCurveArr.length;m++){
										tFfdFrameData.curve.push(tCurveArr[m]);
									}
								};
								var offset=tFfdFrameData.offset=tFrameData.offset;
								var tVertices=tFrameData.vertices;
								var x=0;
								var y=0;
								for (m=0;m < tDisplay.vertices.length;m+=2){
									if (!tVertices || m < offset || m-offset >=tVertices.length){
										x=y=0;
										}else {
										x=tVertices[m-offset];
										y=tVertices[m+1-offset];
									}
									if (tDisplay.skinned){
										Point.TEMP.setTo(x,y);
										LayaFactory.transformPoint(tDisplay.slotPose,Point.TEMP,true);
										x=Point.TEMP.x;
										y=Point.TEMP.y;
										var tIndices=tDisplay.boneIndices[m / 2];
										for (var iB=0,lB=tIndices.length;iB < lB;iB++){
											var boneIndex=tIndices[iB];
											Point.TEMP.x=x;
											Point.TEMP.y=y;
											LayaFactory.transformPoint(tDisplay.inverseBindPose[boneIndex],Point.TEMP,true);
											x=Point.TEMP.x;
											y=Point.TEMP.y;
											tFfdFrameData.tweens.push(x,y);
										}
										}else {
										tFfdFrameData.tweens.push(tDisplay.vertices[m]+x,tDisplay.vertices[m+1]+y);
									}
								}
							}
							tMyAnimationData.ffdArr.push(tAniFfdData);
						}
						LayaFactory.readDrawOrders(tAnimationData,tMyAnimationData,tArmature.slotArr.length,tArmature.onFrameTime);
						tArmature.animationDic[tMyAnimationData.name]=tMyAnimationData;
						tArmature.animationArr.push(tMyAnimationData);
					};
					var tFfdAniData;
					var tSkinAni;
					for (j=0;j < tArmature.animationArr.length;j++){
						var tMyAnimationData=tArmature.animationArr[j];
						tSkinAni=new DeformSkinAni();
						tSkinAni.name=tArmature.defaultSkin.name;
						tMyAnimationData.deformSkinAniList.push(tSkinAni);
						for (l=0;l < tMyAnimationData.ffdArr.length;l++){
							tFfdAniData=tMyAnimationData.ffdArr[l];
							var tDeformSlotData;
							if (tSkinAni.deformSlotDic[tFfdAniData.name]){
								tDeformSlotData=tSkinAni.deformSlotDic[tFfdAniData.name];
								}else {
								tDeformSlotData=new DeformSlotData();
								tSkinAni.deformSlotDic[tFfdAniData.name]=tDeformSlotData;
								tSkinAni.deformSlotArray.push(tDeformSlotData);
							};
							var tDeformSlotDisplayData=new DeformSlotDisplayData();
							tDeformSlotData.mDisplayArray.push(tDeformSlotDisplayData);
							tDeformSlotDisplayData.slotIndex=tArmature.findSlotIndex(tFfdAniData.slot.name);
							tDeformSlotDisplayData.attachment=tFfdAniData.name;
							var tFrameTime=0;
							for (k=0;k < tFfdAniData.frame.length;k++){
								var tFfdFrameData=tFfdAniData.frame[k];
								tDeformSlotDisplayData.timeList.push(tFrameTime);
								tDeformSlotDisplayData.tweenKeyList.push(true);
								tFrameTime+=tFfdFrameData.duration *tArmature.onFrameTime;
								var tVectices=[];
								for (m=0;m < tFfdFrameData.tweens.length;m++){
									tVectices.push(tFfdFrameData.tweens[m]);
								}
								tDeformSlotDisplayData.vectices.push(tVectices);
							}
						}
					}
					break ;
				}
			}
			this.event("complete");
		}

		__proto.buildArmature=function(armatureName){
			var tArmature=new Armature;
			tArmature.display=new Sprite();
			var tArmatureData=this.mArmatureDic[armatureName];
			tArmature.armatureData=tArmatureData;
			if (tArmatureData){
				var i=0,j=0,z=0;
				var tMyBoneData;
				var tParentBone;
				var tMyBone;
				var tRootBone;
				for (i=0;i < tArmatureData.boneArr.length;i++){
					tMyBoneData=tArmatureData.boneArr[i];
					tMyBone=new DBBone();
					tMyBone.setData(tMyBoneData);
					if (tRootBone){
						tParentBone=tRootBone.findBone(tMyBoneData.parent);
						if (tParentBone){
							tParentBone.addChild(tMyBone);
							}else {
							tRootBone=tMyBone;
						}
						}else {
						tRootBone=tMyBone;
					}
				}
				tArmature.boneRoot=tRootBone;
				var tMyBoneSlot;
				var tMyBoneSlotData;
				for (i=0;i < tArmatureData.slotArr.length;i++){
					tMyBoneSlotData=tArmatureData.slotArr[i];
					tMyBone=tRootBone.findBone(tMyBoneSlotData.parent);
					if (tMyBone){
						this.mSlotDic[tMyBoneSlotData.name]=tMyBoneSlot=tMyBone.setSlot(tMyBoneSlotData);
						tArmature.display.addChild(tMyBoneSlot);
					}
				};
				var tMySkinData;
				var tMySlotData;
				var tMyDisplayData;
				var tTexture;
				for (i=0;i < tArmatureData.skinArr.length;i++){
					if (i !=0)break ;
					tMySkinData=tArmatureData.skinArr[i];
					for (j=0;j < tMySkinData.slotArr.length;j++){
						tMySlotData=tMySkinData.slotArr[j];
						tMyBoneSlot=this.mSlotDic[tMySlotData.name];
						if (tMyBoneSlot){
							for (z=0;z < tMySlotData.displayArr.length;z++){
								tMyDisplayData=tMySlotData.displayArr[z];
								tTexture=this.getSpriteByName(tMyDisplayData.name);
								if (tTexture){
									tMyBoneSlot.addSprite(tTexture,tMyDisplayData);
								}
							}
							tMyBoneSlot.showSprite(0);
						}
					}
				}
			}
			return tArmature;
		}

		__proto.getSpriteByName=function(name){
			var tTexture=this.mSubTextureDic[name];
			return tTexture;
		}

		__proto.parseTransform=function(data,pivot){
			var tTransform
			if (data){
				tTransform=new DBTransform();
				tTransform.initData(data);
			}
			if (pivot){
				pivot.x=data.pX;
				pivot.y=data.pY;
			}
			return tTransform;
		}

		LayaFactory.readDrawOrders=function(map,tAnimation,slotCount,onFrameTime){
			if (!map["zOrder"])return;
			var drawOrderValues=map["zOrder"].frame;
			if (!drawOrderValues)return;
			if (drawOrderValues){
				var tDrawOrderArr=tAnimation.drawOrderArr;
				var frameIndex=0;
				var slotIndex=0;
				var i=0,len=0;
				len=drawOrderValues.length;
				var drawOrderMap;
				for(var $each_drawOrderMap in drawOrderValues){
					drawOrderMap=drawOrderValues[$each_drawOrderMap];
					var drawOrder=__newvec(slotCount);
					var tDOAniData;
					if (drawOrderMap["zOrder"]){
						for (i=0;i < slotCount;i++){
							drawOrder[i]=-1;
						};
						var offsets=drawOrderMap["zOrder"];
						var unchanged=new Array(slotCount-offsets.length*0.5);
						var originalIndex=0;
						var unchangedIndex=0;
						var tOffset=0;
						var j=0,jLen=0;
						jLen=offsets.length;
						for (j=0;j < jLen;j+=2){
							slotIndex=offsets[j];
							tOffset=offsets[j+1];
							if (slotIndex==-1)console.log("Slot not found: "+slotIndex);
							while (originalIndex !=slotIndex){
								unchanged[unchangedIndex++]=originalIndex++;
							}
							drawOrder[originalIndex+tOffset]=originalIndex++;
						}
						while (originalIndex < slotCount){
							unchanged[unchangedIndex++]=originalIndex++;
						}
						for (i=slotCount-1;i >=0;i--){
							if (drawOrder[i]==-1)drawOrder[i]=unchanged[--unchangedIndex];
						}
						tDOAniData=new DrawOrderAniData();
						tDOAniData.time=(drawOrderMap["duration"]+frameIndex)*onFrameTime;
						tDOAniData.orderArr=drawOrder;
						tDrawOrderArr.push(tDOAniData);
						frameIndex+=drawOrderMap["duration"];
						}else {
						for (i=0;i < slotCount;i++){
							drawOrder[i]=i;
						}
						tDOAniData=new DrawOrderAniData();
						tDOAniData.time=(drawOrderMap["duration"]+frameIndex)*onFrameTime;
						tDOAniData.orderArr=drawOrder;
						tDrawOrderArr.push(tDOAniData);
						frameIndex+=drawOrderMap["duration"];
					}
				}
			}
		}

		LayaFactory.transformPoint=function(matrix,out,delta){
			(delta===void 0)&& (delta=false);
			if (!delta){
				return out.setTo(matrix.a *out.x+matrix.c *out.y+matrix.tx,matrix.b *out.x+matrix.d *out.y+matrix.ty);
				}else {
				return out.setTo(matrix.a *out.x+matrix.c *out.y,matrix.b *out.x+matrix.d *out.y);
			}
			return null;
		}

		return LayaFactory;
	})(EventDispatcher)


	//class Spine.SpineTools extends Tools
	var SpineTools=(function(_super){
		function SpineTools(){
			this.mTexturePath=null;
			this.mTexture2Path=null;
			this.mTextureJsonPath=null;
			this.mSkeletonJsonPath=null;
			this.mSaveAniPath=null;
			this.mSaveTexturePath=null;
			this.mTexture=null;
			this.mTexture2=null;
			this.mTextureJson=null;
			this.mSkeletonJson=null;
			this.versionPath="";
			this.DBFileName="rapter";
			this.mFactory=null;
			this.mCompleteFun=null;
			this.mFailFun=null;
			this.nodePath=null;
			SpineTools.__super.call(this);
			if (Laya.stage==null){
				Laya.init(Browser.clientWidth,Browser.clientHeight,WebGL);
			}
		}

		__class(SpineTools,'Spine.SpineTools',_super);
		var __proto=SpineTools.prototype;
		/*nodePath=__JS__('require("path")');*/
		__proto.loadFile=function(path,outPath,completeFun,failFun){}
		/*var fileName:String;
		DBFileName=nodePath.basename(path).split(".")[0];
		versionPath=path;
		mCompleteFun=completeFun;
		mFailFun=failFun;
		mTexturePath=nodePath.join(versionPath,"texture.png");
		mTextureJsonPath=nodePath.join(versionPath,"texture.json");
		mSkeletonJsonPath=nodePath.join(versionPath,DBFileName+".json");
		mSaveAniPath=nodePath.join(outPath,DBFileName+".sk");
		mSaveTexturePath=nodePath.join(outPath,this.DBFileName+".png");
		Laya.loader.load([{url:mTexturePath,type:Loader.IMAGE },
		{url:mTextureJsonPath,type:Loader.JSON },
		{url:mSkeletonJsonPath,type:Loader.JSON }
		],Handler.create(this,onLoaded));*/
		__proto.testLoaderFile=function(name,path,completeFun,failFun){
			var fileName;
			this.DBFileName=name;
			this.versionPath=path;
			this.mCompleteFun=completeFun;
			this.mFailFun=failFun;
			this.mTexturePath=this.versionPath+".png";
			this.mTextureJsonPath=this.versionPath+".atlas";
			this.mSkeletonJsonPath=this.versionPath+".json";
			this.mSaveAniPath=this.versionPath+this.DBFileName;
			Laya.loader.load([ {url:this.mTexturePath,type:"image" },
			{url:this.mTextureJsonPath,type:"text" },
			{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded));
		}

		__proto.onLoaded=function(){
			this.mTexture=Loader.getRes(this.mTexturePath);
			this.mTextureJson=Loader.getRes(this.mTextureJsonPath);
			this.mSkeletonJson=Loader.getRes(this.mSkeletonJsonPath);
			this.mFactory=new SpineFactory();
			this.mFactory.on("complete",this,this.onCompleteHandler);
			this.mFactory.parseData(this.mTexture,this.mTextureJson,this.mSkeletonJson);
		}

		__proto.onCompleteHandler=function(){
			var testLayaAnimation=new dragonBones.LayaAnimation.TestLayaAnimation();
			var stringJSON=testLayaAnimation.getLayaBoneAni(this.mFactory.mSkeletonData.mArmatureArr,this.mFactory.mDBTextureDataArray);
			var layaAnimationData
			layaAnimationData=JSON.parse(stringJSON);
			var buffer=this.getObjectBuffer(layaAnimationData);
			this.save(this.mSaveAniPath,buffer);
		}

		//保存文件
		__proto.save=function(filename,dataView){
			if (this.mCompleteFun !=null){
				this.mCompleteFun.call(this,filename,dataView,this.mTexturePath,this.mSaveTexturePath);
			}
			this.mCompleteFun=null;
			this.mFailFun=null;
		}

		return SpineTools;
	})(Tools)


	//class Spine.VertexAttachment extends Spine.Attachment
	var VertexAttachment=(function(_super){
		function VertexAttachment(name){
			this.bones=null;
			this.vertices=null;
			this.worldVerticesLength=0;
			VertexAttachment.__super.call(this,name);
		}

		__class(VertexAttachment,'Spine.VertexAttachment',_super);
		var __proto=VertexAttachment.prototype;
		__proto.computeWorldVertices=function(slot,worldVertices){
			this.computeWorldVertices2(slot,0,this.worldVerticesLength,worldVertices,0);
		}

		/**Transforms local vertices to world coordinates.
		*@param start The index of the first local vertex value to transform. Each vertex has 2 values,x and y.
		*@param count The number of world vertex values to output. Must be <={@link #getWorldVerticesLength()}-start.
		*@param worldVertices The output world vertices. Must have a length >=offset+count.
		*@param offset The worldVertices index to begin writing values. */
		__proto.computeWorldVertices2=function(slot,start,count,worldVertices,offset){
			count+=offset;
			var skeleton=slot.boneData.skeleton;
			var x=0;
			var y=0;
			var deformArray=slot.attachmentVertices;
			var vertices=this.vertices;
			var bones=this.bones;
			var deform;
			var v=0,w=0,n=0,i=0,skip=0,f=0;
			var vx=NaN,vy=NaN;
			var wx=NaN,wy=NaN;
			var bone;
			if (bones==null){
				if (deformArray.length > 0)vertices=deformArray;
				bone=slot.boneData;
				x+=bone.resultMatrix.tx;
				y+=bone.resultMatrix.ty;
				var a=bone.resultMatrix.a,b=bone.resultMatrix.b,c=bone.resultMatrix.c,d=bone.resultMatrix.d;
				for (v=start,w=offset;w < count;v+=2,w+=2){
					vx=vertices[v],vy=vertices[v+1];
					worldVertices[w]=vx *a+vy *c+x;
					worldVertices[w+1]=vx *b+vy *d+y;
				}
				return;
			}
			v=0,skip=0;
			for (i=0;i < start;i+=2){
				n=bones[v];
				v+=n+1;
				skip+=n;
			};
			var skeletonBones=skeleton.bones;
			if (deformArray.length==0){
				for (w=offset,b=skip *3;w < count;w+=2){
					wx=x,wy=y;
					n=bones[v++];
					n+=v;
					for (;v < n;v++,b+=3){
						bone=skeletonBones[bones[v]];
						vx=vertices[b];
						vy=vertices[b+1];
						var weight=vertices[b+2];
						wx+=(vx *bone.resultMatrix.a+vy *bone.resultMatrix.c+bone.resultMatrix.tx)*weight;
						wy+=(vx *bone.resultMatrix.b+vy *bone.resultMatrix.d+bone.resultMatrix.ty)*weight;
					}
					worldVertices[w]=wx;
					worldVertices[w+1]=wy;
				}
				}else {
				deform=deformArray;
				for (w=offset,b=skip *3,f=skip << 1;w < count;w+=2){
					wx=x;
					wy=y;
					n=bones[v++];
					n+=v;
					for (;v < n;v++,b+=3,f+=2){
						bone=skeletonBones[bones[v]];
						vx=vertices[b]+deform[f];
						vy=vertices[b+1]+deform[f+1];
						weight=vertices[b+2];
						wx+=(vx *bone.resultMatrix.a+vy *bone.resultMatrix.b+bone.resultMatrix.tx)*weight;
						wy+=(vx *bone.resultMatrix.c+vy *bone.resultMatrix.d+bone.resultMatrix.ty)*weight;
					}
					worldVertices[w]=wx;
					worldVertices[w+1]=wy;
				}
			}
		}

		/**Returns true if a deform originally applied to the specified attachment should be applied to this attachment. */
		__proto.applyDeform=function(sourceAttachment){
			return this==sourceAttachment;
		}

		return VertexAttachment;
	})(Attachment)


	/**
	*...
	*@author
	*/
	//class Spine.RegionAttachment extends Spine.Attachment
	var RegionAttachment=(function(_super){
		function RegionAttachment(name){
			this.X1=0;
			this.Y1=1;
			this.X2=2;
			this.Y2=3;
			this.X3=4;
			this.Y3=5;
			this.X4=6;
			this.Y4=7;
			this.x=0;
			this.y=0;
			this.scaleX=1;
			this.scaleY=1;
			this.rotation=0;
			this.width=0;
			this.height=0;
			this.r=1;
			this.g=1;
			this.b=1;
			this.a=1;
			this.path=null;
			this.rendererObject=null;
			this.regionOffsetX=NaN;
			this.regionOffsetY=NaN;
			this.regionWidth=NaN;
			this.regionHeight=NaN;
			this.regionOriginalWidth=NaN;
			this.regionOriginalHeight=NaN;
			this.uvs=[];
			this.offset=[];
			RegionAttachment.__super.call(this,name);
		}

		__class(RegionAttachment,'Spine.RegionAttachment',_super);
		var __proto=RegionAttachment.prototype;
		__proto.setUvs=function(u,v,u2,v2,rotate){
			if (rotate){
				this.uvs[this.X1]=u2;
				this.uvs[this.Y1]=v2;
				this.uvs[this.X2]=u2;
				this.uvs[this.Y2]=v;
				this.uvs[this.X3]=u;
				this.uvs[this.Y3]=v;
				this.uvs[this.X4]=u;
				this.uvs[this.Y4]=v2;
				}else {
				this.uvs[this.X1]=u;
				this.uvs[this.Y1]=v2;
				this.uvs[this.X2]=u2;
				this.uvs[this.Y2]=v2;
				this.uvs[this.X3]=u2;
				this.uvs[this.Y3]=v;
				this.uvs[this.X4]=u;
				this.uvs[this.Y4]=v;
			}
		}

		__proto.updateOffset=function(){
			var regionScaleX=this.width / this.regionOriginalWidth *this.scaleX;
			var regionScaleY=this.height / this.regionOriginalHeight *this.scaleY;
		}

		__proto.computeWorldVertices=function(x,y){}
		return RegionAttachment;
	})(Attachment)


	/**
	*...
	*@author
	*/
	//class Spine.WeightedMeshAttachment extends Spine.Attachment
	var WeightedMeshAttachment=(function(_super){
		function WeightedMeshAttachment(name){
			this.bones=null;
			this.weights=null;
			this.uvs=null;
			this.regionsUVs=null;
			this.triangles=null;
			this.hullLength=0;
			this.r=1;
			this.g=1;
			this.b=1;
			this.a=1;
			this._parentMesh=null;
			this.inheritFFD=false;
			this.path=null;
			this.rendererObject=null;
			this.regionU=NaN;
			this.regionV=NaN;
			this.regionU2=NaN;
			this.regionV2=NaN;
			this.regionRotate=false;
			this.regionOffsetX=NaN;
			this.regionOffsetY=NaN;
			this.regionWidth=NaN;
			this.regionHeight=NaN;
			this.regionOriginalWidth=NaN;
			this.regionOriginalHeight=NaN;
			this.edges=null;
			this.width=NaN;
			this.height=NaN;
			WeightedMeshAttachment.__super.call(this,name);
		}

		__class(WeightedMeshAttachment,'Spine.WeightedMeshAttachment',_super);
		var __proto=WeightedMeshAttachment.prototype;
		__proto.updateUVs=function(){
			var width=this.regionU2-this.regionU;
			var height=this.regionV2-this.regionV;
			var i=0;
			var n=this.regionsUVs.length;
			if (!this.uvs || this.uvs.length !=n)this.uvs=[];
			if (this.regionRotate){
				for (i=0;i < n;i+=2){
					this.uvs[i]=this.regionU+this.regionsUVs[i+1] *width;
					this.uvs[i+1]=this.regionV+height-this.regionsUVs[i] *height;
				}
				}else {
				for (i=0;i < n;i+=2){
					this.uvs[i]=this.regionU+this.regionsUVs[i] *width;
					this.uvs[i+1]=this.regionV+this.regionsUVs[i+1] *height;
				}
			}
		}

		__proto.computeWorldVertices=function(x,y,slot,worldVertices){}
		__proto.getSprite=function(_skeledata,texture){
			var tBones=_skeledata.bones;
			var tVBArray=[];
			var tIBArray=[];
			var tRed=1;
			var tGreed=1;
			var tBlue=1;
			var tAlpha=1;
			var tB=0;
			var tVertices=[];
			var tX=NaN;
			var tY=NaN;
			var tBoneData;
			var tWeight=NaN;
			for (var j=0;j < this.bones.length;){
				var tRX=0;
				var tRY=0;
				var nn=this.bones[j++]+j;
				for (;j < nn;j++){
					tBoneData=tBones[this.bones[j]];
					tX=this.weights[tB];
					tY=this.weights[tB+1];
					tWeight=this.weights[tB+2];
					tRX+=(tX *tBoneData.resultMatrix.a+tY *tBoneData.resultMatrix.c+tBoneData.resultMatrix.tx)*tWeight;
					tRY+=(tX *tBoneData.resultMatrix.b+tY *tBoneData.resultMatrix.d+tBoneData.resultMatrix.ty)*tWeight;
					tB+=3;
				}
				tVertices.push(tRX,tRY);
			}
			for (var i=0,ii=0;i < tVertices.length && ii< this.uvs.length;){
				tX=tVertices[i++];
				tY=tVertices[i++];
				tVBArray.push(tX,tY,this.uvs[ii++],this.uvs[ii++],tRed,tGreed,tBlue,tAlpha);
			};
			var tTriangleNum=this.triangles.length / 3;
			for (i=0;i < tTriangleNum;i++){
				tIBArray.push(this.triangles[i *3]);
				tIBArray.push(this.triangles[i *3+1]);
				tIBArray.push(this.triangles[i *3+2]);
			}
			return;
		}

		return WeightedMeshAttachment;
	})(Attachment)


	/**
	*...
	*@author
	*/
	//class Spine.MeshAttachment extends Spine.VertexAttachment
	var MeshAttachment=(function(_super){
		function MeshAttachment(name){
			this.uvs=null;
			this.regionUVs=null;
			this.triangles=null;
			this.hullLength=0;
			this.r=1;
			this.g=1;
			this.b=1;
			this.a=1;
			this._parentMesh=null;
			this.inheritFFD=false;
			this.inheritDeform=false;
			this.path=null;
			this.rendererObject=null;
			this.regionU=NaN;
			this.regionV=NaN;
			this.regionU2=NaN;
			this.regionV2=NaN;
			this.regionRotate=false;
			this.regionOffsetX=NaN;
			this.regionOffsetY=NaN;
			this.regionWidth=NaN;
			this.regionHeight=NaN;
			this.regionOriginalWidth=NaN;
			this.regionOriginalHeight=NaN;
			this.edges=null;
			this.width=NaN;
			this.height=NaN;
			MeshAttachment.__super.call(this,name);
		}

		__class(MeshAttachment,'Spine.MeshAttachment',_super);
		var __proto=MeshAttachment.prototype;
		__proto.updateUvs=function(){
			var width=this.regionU2-this.regionU;
			var height=this.regionV2-this.regionV;
			var i=0;
			var n=this.regionUVs.length;
			if (!this.uvs || this.uvs.length !=n)this.uvs=new Array(n);
			if (this.regionRotate){
				for (i=0;i < n;i+=2){
					this.uvs[i]=this.regionU+this.regionUVs[i+1] *width;
					this.uvs[i+1]=this.regionV+height-this.regionUVs[i] *height;
				}
				}else {
				for (i=0;i < n;i+=2){
					this.uvs[i]=this.regionU+this.regionUVs[i] *width;
					this.uvs[i+1]=this.regionV+this.regionUVs[i+1] *height;
				}
			}
		}

		__proto.getSprite=function(sprite,_skeledata,texture,slot,meshAttachment){
			var tWorldVertices=[];
			meshAttachment.computeWorldVertices(slot,tWorldVertices);
			var tIBArray=[];
			var tVBArray=[];
			var tResultX=0;
			var tResultY=0;
			var tRed=1;
			var tGreed=1;
			var tBlue=1;
			var tAlpha=0.8;
			for (var i=0,ii=0;i < tWorldVertices.length && ii< this.uvs.length;){
				tResultX=tWorldVertices[i++];
				tResultY=tWorldVertices[i++];
				sprite.graphics.drawCircle(tResultX,tResultY,2.5,"#ff0000");
				tVBArray.push(tResultX,tResultY,this.uvs[ii++],this.uvs[ii++],tRed,tGreed,tBlue,tAlpha);
			};
			var tTriangleNum=this.triangles.length / 3;
			for (i=0;i < tTriangleNum;i++){
				tIBArray.push(this.triangles[i *3]);
				tIBArray.push(this.triangles[i *3+1]);
				tIBArray.push(this.triangles[i *3+2]);
			}
		}

		__proto.drawSprite=function(skeleton,sprite,slot){
			var tWorldVertices=[];
			this.computeWorldVertices(slot,tWorldVertices);
			for (var i=0;i < tWorldVertices.length;i+=2){
				var vx=this.vertices[i];
				var vy=this.vertices[i+1];
				sprite.graphics.drawCircle(vx,vy,5,"#ff0000");
			}
		}

		__getset(0,__proto,'parentMesh',function(){
			return this._parentMesh;
			},function(parentMesh){
			this._parentMesh=parentMesh;
			if (parentMesh !=null){
				this.bones=parentMesh.bones;
				this.vertices=parentMesh.vertices;
				this.worldVerticesLength=parentMesh.worldVerticesLength;
				this.regionUVs=parentMesh.regionUVs;
				this.triangles=parentMesh.triangles;
				this.hullLength=parentMesh.hullLength;
				this.edges=parentMesh.edges;
				this.width=parentMesh.width;
				this.height=parentMesh.height;
			}
		});

		return MeshAttachment;
	})(VertexAttachment)


	/**
	*...
	*@author
	*/
	//class Spine.PathAttachment extends Spine.VertexAttachment
	var PathAttachment=(function(_super){
		function PathAttachment(name){
			this.lengths=null;
			this.closed=false;
			this.constantSpeed=false;
			PathAttachment.__super.call(this,name);
		}

		__class(PathAttachment,'Spine.PathAttachment',_super);
		return PathAttachment;
	})(VertexAttachment)


	/**
	*...
	*@author ...
	*/
	//class dragonBones.DBBoneSlot extends laya.display.Sprite
	var DBBoneSlot=(function(_super){
		function DBBoneSlot(){
			this.slotData=null;
			this.textureArray=[];
			this.displayDataArray=[];
			this.currDisplayData=null;
			DBBoneSlot.__super.call(this);
			this.mResultMatrix=new Matrix();
		}

		__class(DBBoneSlot,'dragonBones.DBBoneSlot',_super);
		var __proto=DBBoneSlot.prototype;
		__proto.addSprite=function(texture,displayData){
			this.textureArray.push(texture);
			this.displayDataArray.push(displayData);
		}

		__proto.showSprite=function(index){
			if (index < this.textureArray.length){
				var tTexture=this.textureArray[index];
				this.graphics.clear();
				var tX=-tTexture.width / 2;
				var tY=-tTexture.height / 2;
				this.currDisplayData=this.displayDataArray[index];
				this.graphics.drawTexture(tTexture,tX,tY,tTexture.width);
			}
		}

		//this.graphics.fillBorderText(slotData.name,0,0,null,"#ff0000",null,0,"center");
		__proto.displayMatrix=function(){
			if (this.currDisplayData){
				return this.currDisplayData.transform.getMatrix();
			}
			return null;
		}

		__proto.setParentMatrix=function(parentMatrix){
			var tMatrix=this.displayMatrix();
			if (tMatrix){
				Matrix.mul(tMatrix,parentMatrix,this.mResultMatrix);
				this.transform=this.mResultMatrix;
			}
		}

		return DBBoneSlot;
	})(Sprite)


	/**
	*...
	*@author
	*/
	//class Spine.SpineFactory extends laya.display.Sprite
	var SpineFactory=(function(_super){
		function SpineFactory(){
			this.mStartX=600;
			this.mStartY=600;
			this.mAtlas=null;
			this.mSkeletonData=null;
			SpineFactory.__super.call(this);
			this.mDBTextureDataArray=[];
			this.mLinkedMeshes=[];
		}

		__class(SpineFactory,'Spine.SpineFactory',_super);
		var __proto=SpineFactory.prototype;
		__proto.parseData=function(textureMap,textureJson,skeletonJson){
			SpineFileAdpter.I.adptSpineFile(skeletonJson);
			var tSkeletonData=new SkeletonData();
			this.mSkeletonData=tSkeletonData;
			var tArmature=new DBArmatureData();
			tArmature.frameRate=30;
			tArmature.onFrameTime=1000;
			tSkeletonData.mArmatureArr.push(tArmature);
			this.mAtlas=new Atlas();
			this.mAtlas.init(textureMap,textureJson);
			var i=0;
			var j=0;
			var z=0;
			var tJson=skeletonJson;
			var skeletonMap=tJson.skeleton;
			if (skeletonMap){
				var tHash=skeletonMap.hash;
				var tSpine=skeletonMap.spine;
				var tWidth=skeletonMap.width || 0;
				var tHeight=skeletonMap.height || 0;
			};
			var tBoneData;
			var tParentBoneData;
			var tBoneMap;
			var tArray=tJson.bones;
			var tScale=1;
			for (i=0;i < tArray.length;i++){
				tBoneMap=tArray[i];
				tBoneData=new BoneData();
				tBoneData.skeleton=tSkeletonData;
				var parentName=tBoneMap.parent;
				if (parentName){
					tBoneData.parent=parentName;
				}
				tBoneData.name=tBoneMap.name;
				tBoneData.length=(tBoneMap.length || 0)*tScale;
				tBoneData.x=(tBoneMap.x || 0)*tScale;
				tBoneData.y=(tBoneMap.y || 0)*tScale;
				tBoneData.rotation=tBoneMap.rotation || 0;
				tBoneData.scaleX=tBoneMap.hasOwnProperty("scaleX")? tBoneMap["scaleX"] :1;
				tBoneData.scaleY=tBoneMap.hasOwnProperty("scaleY")? tBoneMap["scaleY"] :1;
				tBoneData.shearX=tBoneMap.shearX || 0;
				tBoneData.shearY=tBoneMap.shearY || 0;
				tBoneData.inheritRotation=tBoneMap.hasOwnProperty("inheritRotation")? tBoneMap["inheritRotation"] :true;
				tBoneData.inheritScale=tBoneMap.hasOwnProperty("inheritScale")? tBoneMap["inheritScale"] :true;
				if (tBoneMap["transform"]){
					switch(tBoneMap["transform"]){
						case "onlyTranslation":
							tBoneData.inheritRotation=false;
							tBoneData.inheritScale=false;
							break ;
						case "noScaleOrReflection":
						case "noScale":
							tBoneData.inheritRotation=true;
							tBoneData.inheritScale=false;
							break ;
						case "noRotationOrReflection":
						case "noRotation":
							tBoneData.inheritRotation=false;
							tBoneData.inheritScale=true;
							break ;
						}
				}
				tSkeletonData.bones.push(tBoneData);
			}
			tArray=tJson.slots;
			var tSlotMap;
			var tSlotData;
			for (i=0;i < tArray.length;i++){
				tSlotMap=tArray[i];
				tSlotData=new SlotData();
				tSlotData.name=tSlotMap.name;
				tSlotData.boneName=tSlotMap.bone;
				var tColor=tSlotMap.color;
				if (tColor){
					tSlotData.r=SpineFactory.toColor(tColor,0);
					tSlotData.g=SpineFactory.toColor(tColor,1);
					tSlotData.b=SpineFactory.toColor(tColor,2);
					tSlotData.a=SpineFactory.toColor(tColor,3);
				}
				tSlotData.attachmentName=tSlotMap.attachment;
				tSlotData.blendMode;
				tSkeletonData.slots.push(tSlotData);
			};
			var tTextureSprite=new Sprite();
			tTextureSprite.x=this.mStartX;
			tTextureSprite.y=this.mStartY;
			tTextureSprite.scale(2,-2);
			if (!BoneAniTools.mBoneToolsKey){
				Laya.stage.addChild(tTextureSprite);
			};
			var tBones=tSkeletonData.bones;
			var tMatrix;
			for (i=0;i < tBones.length;i++){
				tBoneData=tBones[i];
				tParentBoneData=tSkeletonData.findBone(tBoneData.parent);
				if (tParentBoneData){
					tMatrix=new Matrix();
					tMatrix.identity();
					tMatrix.rotate(tBoneData.rotation/180 *Math.PI);
					tMatrix.scale(tBoneData.scaleX,tBoneData.scaleY);
					tMatrix.setTranslate(tBoneData.x,tBoneData.y);
					var tResultMatrix=new Matrix();
					tResultMatrix.identity();
					Matrix.mul(tMatrix,tParentBoneData.resultMatrix,tResultMatrix);
					tBoneData.resultMatrix=tResultMatrix;
					}else {
					tMatrix=new Matrix();
					tMatrix.identity();
					tMatrix.rotate(tBoneData.rotation);
					tMatrix.scale(tBoneData.scaleX,tBoneData.scaleY);
					tMatrix.translate(tBoneData.x,tBoneData.y);
					tBoneData.resultMatrix=tMatrix;
				}
				tTextureSprite.graphics.drawCircle(tBoneData.resultMatrix.tx,tBoneData.resultMatrix.ty,5,"#00ff00");
				var tSprite=new Sprite();
				tSprite.graphics.drawRect(0,-2.5,tBoneData.length,5,"#0000ff");
				tSprite.rotation=tBoneData.rotation;
				tSprite.transform=tBoneData.resultMatrix.clone();
				tTextureSprite.addChild(tSprite);
			}
			var constraintMap;
			for(var $each_constraintMap in tJson.ik){
				constraintMap=tJson.ik[$each_constraintMap];
				var tIkConstaintData=new SpineIkConstraintData();
				tIkConstaintData.name=constraintMap.name;
				var boneName;
				for(var $each_boneName in constraintMap.bones){
					boneName=constraintMap.bones[$each_boneName];
					tBoneData=tSkeletonData.findBone(boneName);
					if (!tBoneData)console.log("IK constraint bone not found:"+boneName);
					tIkConstaintData.boneNames.push(boneName);
					tIkConstaintData.boneIndexs.push(tSkeletonData.findBoneIndex(boneName));
				}
				tIkConstaintData.targetBoneName=constraintMap.target;
				tIkConstaintData.targetBoneIndex=tSkeletonData.findBoneIndex(tIkConstaintData.targetBoneName);
				if (!tIkConstaintData.targetBoneName)console.log("Target bone not found:"+tIkConstaintData.targetBoneName);
				tIkConstaintData.bendDirection=(!constraintMap.hasOwnProperty("bendPositive")|| constraintMap["bendPositive"])? 1 :-1;
				tIkConstaintData.mix=constraintMap.hasOwnProperty("mix")? constraintMap["mix"]:1;
				tArmature.ikArr.push(tIkConstaintData);
				tSkeletonData.ikConstraints.push(tIkConstaintData);
			};
			var tTransformConstraintData;
			var $each_constraintMap;
			for($each_constraintMap in tJson.transform){
				constraintMap=tJson.transform[$each_constraintMap];
				tTransformConstraintData=new TransformConstraintData();
				tTransformConstraintData.name=constraintMap.name;
				var $each_boneName;
				for($each_boneName in constraintMap.bones){
					boneName=constraintMap.bones[$each_boneName];
					var tBoneIndex=tSkeletonData.findBoneIndex(boneName);
					if (tBoneIndex >-1){
						tTransformConstraintData.boneIndexs.push(tBoneIndex);
					}
				}
				tTransformConstraintData.target=tSkeletonData.findBoneIndex(constraintMap.target);
				tTransformConstraintData.offsetRotation=constraintMap.rotation || 0;
				tTransformConstraintData.offsetX=constraintMap.x || 0;
				tTransformConstraintData.offsetY=constraintMap.y || 0;
				tTransformConstraintData.offsetScaleX=constraintMap.scaleX || 0;
				tTransformConstraintData.offsetScaleY=constraintMap.scaleY || 0;
				tTransformConstraintData.offsetShearY=constraintMap.shearY || 0;
				tTransformConstraintData.rotateMix=constraintMap.hasOwnProperty("rotateMix")? constraintMap["rotateMix"] :1;
				tTransformConstraintData.translateMix=constraintMap.hasOwnProperty("translateMix")? constraintMap["translateMix"] :1;
				tTransformConstraintData.scaleMix=constraintMap.hasOwnProperty("scaleMix")? constraintMap["scaleMix"] :1;
				tTransformConstraintData.shearMix=constraintMap.hasOwnProperty("shearMix")? constraintMap["shearMix"] :1;
				tArmature.transformArr.push(tTransformConstraintData);
				tSkeletonData.transformConstraints.push(tTransformConstraintData);
			};
			var pathConstraintData;
			var $each_constraintMap;
			for($each_constraintMap in tJson.path){
				constraintMap=tJson.path[$each_constraintMap];
				pathConstraintData=new PathConstraintData();
				pathConstraintData.name=constraintMap.name;
				var $each_boneName;
				for($each_boneName in constraintMap.bones){
					boneName=constraintMap.bones[$each_boneName];
					pathConstraintData.bones.push(boneName);
					pathConstraintData.boneIds.push(tSkeletonData.findBoneIndex(boneName));
				}
				pathConstraintData.target=constraintMap.target;
				pathConstraintData.positionMode=constraintMap.positionMode || "percent";
				pathConstraintData.spacingMode=constraintMap.spacingMode || "length";
				pathConstraintData.rotateMode=constraintMap.rotateMode || "rotateMode";
				pathConstraintData.offsetRotation=constraintMap.rotation || 0;
				pathConstraintData.position=constraintMap.position || 0;
				if (pathConstraintData.positionMode=="fixed")pathConstraintData.position *=tScale;
				pathConstraintData.spacing=constraintMap.spacing || 0;
				if (pathConstraintData.spacingMode=="length" || pathConstraintData.spacingMode=="fixed"){
					pathConstraintData.spacing *=tScale;
				}
				pathConstraintData.rotateMix=constraintMap.hasOwnProperty("rotateMix")?constraintMap.rotateMix:1;
				pathConstraintData.translateMix=constraintMap.hasOwnProperty("translateMix")?constraintMap.translateMix:1;
				tArmature.pathArr.push(pathConstraintData);
				tSkeletonData.pathConstraints.push(pathConstraintData);
			};
			var tSkins=tSkeletonData.skins;
			var skinMap;
			var skin;
			var tDBSkinData;
			var tDBSlotData;
			var tDBSkinSlotDisplayData;
			var tDBTransform;
			var tRegionAttachment;
			var tMeshAttachment;
			var tWeightedMeshAttachment;
			var tPathAttachment;
			var attachment;
			var skins=tJson.skins;
			for (var skinName in skins){
				skinMap=skins[skinName];
				skin=new Skin();
				skin.name=skinName;
				tDBSkinData=new DBSkinData();
				tDBSkinData.name=skinName;
				tArmature.skinArr.push(tDBSkinData);
				for (var slotName in skinMap){
					var slotIndex=tSkeletonData.findSlotIndex(slotName);
					var slotEntry=skinMap[slotName];
					tDBSlotData=new DBSlotData();
					tDBSlotData.name=slotName;
					tDBSlotData.defaultDisplayName=tSkeletonData.slots[slotIndex].attachmentName;
					tDBSkinData.slotArr.push(tDBSlotData);
					for (var attachmentName in slotEntry){
						attachment=this.readAttachment(skin,slotIndex,attachmentName,slotEntry[attachmentName]);
						if (attachment !=null){
							skin.addAttachment(slotIndex,attachmentName,attachment);
							tDBSkinSlotDisplayData=attachment.mDBSkinSlotDisplayData=new DBSkinSlotDisplayData();
							tDBSkinSlotDisplayData.name=attachment.name;
							tDBSkinSlotDisplayData.attachmentName=attachmentName;
							tDBSkinSlotDisplayData.transform=new DBTransform();
							this.setDBDisplayData(attachment);
							tDBSlotData.displayArr.push(tDBSkinSlotDisplayData);
						}
					}
				}
				tSkeletonData.skins[tSkeletonData.skins.length]=skin;
				if (skin.name=="default"){
					tArmature.defaultSkin=tDBSkinData;
					tSkeletonData.defaultSkin=skin;
				}
			}
			for (i=0;i < tArmature.skinArr.length;i++){
				if (tArmature.skinArr[i] !=tArmature.defaultSkin){
					var tDBSkin=tArmature.skinArr[i];
					for (j=0;j < tArmature.defaultSkin.slotArr.length;j++){
						tDBSlotData=tArmature.defaultSkin.slotArr[j];
						tDBSkin.addSlotData(tDBSlotData);
					}
					for (j=0;j < tDBSkin.slotArr.length;j++){
						tDBSlotData=tDBSkin.slotArr[j];
						tDBSlotData.mergeOtherData(tArmature.defaultSkin.getDBSlotData(tDBSlotData.name))
					}
				}
			};
			var tLinkedMeshs=this.mLinkedMeshes;
			var tParentSkin;
			var tParentMesh;
			var linkedMesh;
			for(var $each_linkedMesh in tLinkedMeshs){
				linkedMesh=tLinkedMeshs[$each_linkedMesh];
				tParentSkin=!linkedMesh.skin ? tSkeletonData.defaultSkin:tSkeletonData.findSkin(linkedMesh.skin);
				if (!tParentSkin){
					console.log("Skin not found: "+linkedMesh.skin);
					break ;
				}
				tParentMesh=tParentSkin.getAttachment(linkedMesh.slotIndex,linkedMesh.parent);
				if (!tParentMesh){
					console.log("Parent mesh not found: "+linkedMesh.parent);
				}
				if ((tParentMesh instanceof Spine.MeshAttachment )){
					linkedMesh.mesh.parentMesh=tParentMesh;
					linkedMesh.mesh.updateUvs();
					this.setDBDisplayData(linkedMesh.mesh);
					}else {
					console.log("type error");
				}
			};
			var events=tJson.events;
			if (events){
				for (var eventName in events){
					var eventMap=events[eventName];
					var eventData=new EventData();
					eventData.name=eventName;
					eventData.intValue=eventMap["int"] || 0;
					eventData.floatValue=eventMap["float"] || 0;
					eventData.stringValue=eventMap["string"] || null;
					tSkeletonData.events.push(eventData);
				}
			};
			var tAtlas=this.mAtlas.regions;
			var tAtlasRegion;
			var tDBTextureData;
			for (i=0;i < tAtlas.length;i++){
				tAtlasRegion=tAtlas[i];
				tDBTextureData=new DBTextureData();
				tDBTextureData.name=tAtlasRegion.name;
				tDBTextureData.textureSrc=tAtlasRegion.page.name;
				tDBTextureData.x=tAtlasRegion.x;
				tDBTextureData.y=tAtlasRegion.y;
				if (tAtlasRegion.rotate){
					tDBTextureData.w=tAtlasRegion.height;
					tDBTextureData.h=tAtlasRegion.width;
					}else {
					tDBTextureData.w=tAtlasRegion.width;
					tDBTextureData.h=tAtlasRegion.height;
				}
				tDBTextureData.frameX=tAtlasRegion.offsetX;
				tDBTextureData.frameY=tAtlasRegion.offsetY;
				if (tAtlasRegion.rotate){
					tDBTextureData.frameW=tAtlasRegion.originalHeight;
					tDBTextureData.frameH=tAtlasRegion.originalWidth;
					}else {
					tDBTextureData.frameW=tAtlasRegion.originalWidth;
					tDBTextureData.frameH=tAtlasRegion.originalHeight;
				}
				this.mDBTextureDataArray.push(tDBTextureData);
			};
			var tAnimationMap;
			var tAnimations=tJson.animations;
			var tDBBoneData;
			for (i=0;i < tBones.length;i++){
				var tBone=tBones[i];
				tDBBoneData=new DBBoneData();
				tDBBoneData.name=tBone.name;
				tDBBoneData.parent=tBone.parent;
				tDBTransform=new DBTransform();
				tDBTransform.scX=tBone.scaleX;
				tDBTransform.scY=tBone.scaleY;
				tDBTransform.skY=tDBTransform.skX=tBone.rotation;
				tDBTransform.x=tBone.x;
				tDBTransform.y=tBone.y;
				tDBTransform.skewX=tBone.shearX;
				tDBTransform.skewY=tBone.shearY;
				tDBBoneData.transform=tDBTransform;
				tDBBoneData.length=tBone.length;
				tDBBoneData.inheritRotation=tBone.inheritRotation;
				tDBBoneData.inheritScale=tBone.inheritScale;
				tArmature.boneArr.push(tDBBoneData);
			};
			var tDBBoneSlotData;
			var tSlotArr=tSkeletonData.slots;
			for (i=0;i < tSlotArr.length;i++){
				tSlotData=tSlotArr[i];
				tDBBoneSlotData=new DBBoneSlotData();
				tDBBoneSlotData.name=tSlotData.name;
				tDBBoneSlotData.parent=tSlotData.boneName;
				tDBBoneSlotData.attachmentName=tSlotData.attachmentName;
				tDBSlotData=tArmature.defaultSkin.getDBSlotData(tSlotData.name);
				if (tDBSlotData){
					if (tSlotData.attachmentName){
						tDBBoneSlotData.displayIndex=tDBSlotData.findDisplayIndexByName(tSlotData.attachmentName);
						}else {
						tDBBoneSlotData.displayIndex=-1;
						console.log("error:slot.attachmentName == null");
					}
					}else {
					tDBBoneSlotData.displayIndex=-1;
				}
				tArmature.slotArr.push(tDBBoneSlotData);
			}
			for (var tAnimationName in tAnimations){
				this.readAnimation(tAnimationName,tAnimations[tAnimationName],tArmature);
			}
			this.event("complete");
		}

		__proto.setDBDisplayData=function(attachment){
			var tDBSkinSlotDisplayData=attachment.mDBSkinSlotDisplayData;
			var tDBTransform=tDBSkinSlotDisplayData.transform;
			var tRegionAttachment;
			var tMeshAttachment;
			var tWeightedMeshAttachment;
			var tPathAttachment;
			if ((attachment instanceof Spine.RegionAttachment )){
				tDBSkinSlotDisplayData.type=0;
				tRegionAttachment=attachment;
				tDBTransform.skX=tDBTransform.skY=tRegionAttachment.rotation;
				tDBTransform.scX=tRegionAttachment.scaleX;
				tDBTransform.scY=tRegionAttachment.scaleY;
				tDBTransform.x=tRegionAttachment.x;
				tDBTransform.y=tRegionAttachment.y;
				tDBSkinSlotDisplayData.width=tRegionAttachment.width;
				tDBSkinSlotDisplayData.height=tRegionAttachment.height;
				tDBSkinSlotDisplayData.uvs=tRegionAttachment.uvs;
				}else if ((attachment instanceof Spine.MeshAttachment )){
				tDBSkinSlotDisplayData.type=1;
				tMeshAttachment=attachment;
				tDBSkinSlotDisplayData.uvs=tMeshAttachment.uvs;
				tDBSkinSlotDisplayData.triangles=tMeshAttachment.triangles;
				if (tMeshAttachment.bones){
					tDBSkinSlotDisplayData.bonePose=tMeshAttachment.bones;
				}
				tDBSkinSlotDisplayData.weights=tMeshAttachment.vertices;
				}else if ((attachment instanceof Spine.WeightedMeshAttachment )){
				tDBSkinSlotDisplayData.type=2;
				tWeightedMeshAttachment=attachment;
				tDBSkinSlotDisplayData.uvs=tWeightedMeshAttachment.uvs;
				tDBSkinSlotDisplayData.weights=tWeightedMeshAttachment.weights;
				if (tWeightedMeshAttachment.bones){
					tDBSkinSlotDisplayData.bonePose=tWeightedMeshAttachment.bones;
				}
				tDBSkinSlotDisplayData.triangles=tWeightedMeshAttachment.triangles;
				}else if ((attachment instanceof Spine.PathAttachment )){
				tDBSkinSlotDisplayData.type=3;
				tPathAttachment=attachment;
				if (tPathAttachment.bones){
					tDBSkinSlotDisplayData.bonePose=tPathAttachment.bones;
				}
				tDBSkinSlotDisplayData.weights=tPathAttachment.vertices;
				tDBSkinSlotDisplayData.lengths=tPathAttachment.lengths;
				tDBSkinSlotDisplayData.vertexLen=tPathAttachment.worldVerticesLength;
			}
		}

		__proto.findSlotByBoneName=function(boneName){
			var tSlotData;
			var tSlots=this.mSkeletonData.slots
			for (var i=0;i < tSlots.length;i++){
				tSlotData=tSlots[i];
				if (tSlotData.boneName==boneName){
					return tSlotData;
				}
			}
			return null;
		}

		__proto.readAttachment=function(skin,slotIndex,name,map){
			var tNameIndex=-1;
			if (tNameIndex >-1){
				name=name.slice(tNameIndex+1,name.length);
			}
			name=map.name || name;
			var tTypeName=map.type || "region";
			var tScale=1;
			var tColor;
			var tVertices;
			var tAtlasRegion;
			var tPath=map.path || name;
			var uvs;
			switch(tTypeName){
				case "region":;
					var attachment=new RegionAttachment(name);
					attachment.type=0;
					var region=this.mAtlas.findRegion(tPath);
					attachment.rendererObject=region;
					attachment.setUvs(region.u *tScale,region.v *tScale,region.u2 *tScale,region.v2 *tScale,region.rotate);
					attachment.x=(map.x || 0)*tScale;
					attachment.y=(map.y || 0)*tScale;
					attachment.scaleX=map.hasOwnProperty("scaleX")? map.scaleX :1;
					attachment.scaleY=map.hasOwnProperty("scaleY")? map.scaleY :1;
					attachment.rotation=map.rotation || 0;
					attachment.width=(map.width || 0)*tScale;
					attachment.height=(map.height || 0)*tScale;
					tColor=map.color;
					return attachment;
					break ;
				case "mesh":
				case "linkedmesh":;
					var tMesh=new MeshAttachment(name);
					tMesh.type=1;
					tAtlasRegion=tMesh.rendererObject=this.mAtlas.findRegion(tPath);
					if (tAtlasRegion==null){
						return null;
					}
					tMesh.regionU=tAtlasRegion.u;
					tMesh.regionV=tAtlasRegion.v;
					tMesh.regionU2=tAtlasRegion.u2;
					tMesh.regionV2=tAtlasRegion.v2;
					tMesh.width=(map.width || 0)*tScale;
					tMesh.height=(map.height || 0)*tScale;
					tMesh.regionRotate=tAtlasRegion.rotate;
					if (map.parent){
						tMesh.inheritDeform=map.hasOwnProperty("deform")? Boolean(map.deform):true;
						var tLinkedMesh=new LinkedMesh();
						tLinkedMesh.mesh=tMesh;
						tLinkedMesh.skin=map.skin;
						tLinkedMesh.slotIndex=slotIndex;
						tLinkedMesh.parent=map.parent;
						this.mLinkedMeshes.push(tLinkedMesh);
						return tMesh;
					}
					uvs=this.getFloatArray(map,"uvs",1);
					this.readVertices(map,tMesh,uvs.length);
					tMesh.triangles=this.getFloatArray(map,"triangles",1);
					tMesh.regionUVs=uvs;
					tMesh.updateUvs();
					tMesh.hullLength=parseInt(map["hull"] || 0)*2;
					if (map.edges)tMesh.edges=this.getFloatArray(map,"edges",1);
					return tMesh;
					break ;
				case "skinnedmesh":
				case "weightedlinkedmesh":;
					var tWeightedMesh=new WeightedMeshAttachment(name);
					tWeightedMesh.type=2;
					tColor=map.color;
					tAtlasRegion=tWeightedMesh.rendererObject=this.mAtlas.findRegion(name);
					if (tAtlasRegion==null){
						return null;
					}
					tWeightedMesh.regionU=tAtlasRegion.u;
					tWeightedMesh.regionV=tAtlasRegion.v;
					tWeightedMesh.regionU2=tAtlasRegion.u2;
					tWeightedMesh.regionV2=tAtlasRegion.v2;
					tWeightedMesh.regionRotate=tAtlasRegion.rotate;
					tWeightedMesh.width=(map.width || 0)*tScale;
					tWeightedMesh.height=(map.height || 0)*tScale;
					if (!map.parent){
						uvs=this.getFloatArray(map,"uvs",1);
						tVertices=this.getFloatArray(map,"vertices",1);
						var weights=[];
						var bones=[];
						for (var i=0;i < tVertices.length;){
							var boneCount=tVertices[i++];
							bones.push(boneCount);
							for (var nn=i+boneCount *4;i < nn;){
								bones.push(tVertices[i++]);
								weights.push(tVertices[i++] *tScale);
								weights.push(tVertices[i++] *tScale);
								weights.push(tVertices[i++]);
							}
						}
						tWeightedMesh.bones=bones;
						tWeightedMesh.weights=weights;
						tWeightedMesh.triangles=this.getFloatArray(map,"triangles",1);
						tWeightedMesh.regionsUVs=uvs;
						tWeightedMesh.updateUVs();
					}
					return tWeightedMesh;
					break ;
				case "path":;
					var tPathAttachment=new PathAttachment(name);
					tPathAttachment.type=3;
					tPathAttachment.closed=map.hasOwnProperty("closed")? Boolean(map["closed"]):false;
					tPathAttachment.constantSpeed=map.hasOwnProperty("constantSpeed")? Boolean(map["constantSpeed"]):true;
					var vertexCount=parseInt(map["vertexCount"]);
					this.readVertices(map,tPathAttachment,vertexCount << 1);
					var lengths=[];
					var curves;
					for(var $each_curves in map["lengths"]){
						curves=map["lengths"][$each_curves];
						lengths.push(Number(curves)*tScale);
					}
					tPathAttachment.lengths=lengths;
					return tPathAttachment;
					break ;
				}
			return null;
		}

		__proto.getFloatArray=function(map,name,scale){
			var list=map[name];
			var values=[];
			var i=0;
			var n=list.length;
			if (scale==1){
				for (;i < n;i++){
					values.push(list[i]);
				}
				}else {
				for (;i < n;i++){
					values.push(list[i] *scale);
				}
			}
			return values;
		}

		__proto.readVertices=function(map,attachment,verticesLength){
			var tScale=1;
			attachment.worldVerticesLength=verticesLength;
			var vertices=this.getFloatArray(map,"vertices",1);
			var i=0,n=0;
			if (verticesLength==vertices.length){
				if (tScale !=1){
					for (i=0,n=vertices.length;i < n;i++){
						vertices[i] *=tScale;
					}
				}
				attachment.vertices=vertices;
				return;
			};
			var weights=new Array(verticesLength *3 *3);
			weights.length=0;
			var bones=new Array(verticesLength *3);
			bones.length=0;
			for (i=0,n=vertices.length;i < n;){
				var boneCount=parseInt(vertices[i++]);
				bones.push(boneCount);
				for (var nn=i+boneCount *4;i < nn;i+=4){
					bones.push(parseInt(vertices[i]));
					weights.push(vertices[i+1] *tScale);
					weights.push(vertices[i+2] *tScale);
					weights.push(vertices[i+3]);
				}
			}
			attachment.bones=bones;
			attachment.vertices=weights;
		}

		__proto.getCurveType=function(curve){
			return curve;
			if (!curve)return-1;
			switch(curve){
				case "stepped":
					return 1;
					break ;
				}
			return-1;
		}

		/**
		*解析动画数据
		*@param name
		*@param map
		*@param armature
		*/
		__proto.readAnimation=function(name,map,armature){
			var tBones=map.bones;
			if (tBones==null){
			};
			var tAnimation=new DBAnimationData();
			tAnimation.name=name;
			armature.animationArr.push(tAnimation);
			var i=0,j=0,z=0;
			var tFrameIndex=0;
			var tMaxTime=0;
			var tAniBone;
			var tAnimBoneFrame;
			var tNextAniBoneFrame;
			var tDBBoneDataArr=armature.boneArr;
			var tDBBoneData;
			var tBoneName;
			for (i=0;i < tDBBoneDataArr.length;i++){
				tDBBoneData=tDBBoneDataArr[i];
				tBoneName=tDBBoneData.name;
				tAniBone=new DBAniBoneData();
				tAniBone.name=tBoneName;
				tAnimation.boneArr.push(tAniBone);
				var tBoneAniData=new BoneAniData();
				var tBoneAniDataNew=new BoneAniDataNew();
				var tBoneMap;
				if (tBones){
					tBoneMap=tBones[tBoneName];
					}else{
					tBoneMap=null;
				}
				if (tBoneMap){
					for (var tTimeLineName in tBoneMap){
						var tValues=tBoneMap[tTimeLineName];
						var tValue;
						tBoneAniDataNew.addFrames(tTimeLineName,tValues);
						switch(tTimeLineName){
							case "rotate":
								for (j=0;j < tValues.length;j++){
									tValue=tValues[j];
									tBoneAniData.addData(tValue.time,"rotate",[tValue.angle,this.getCurveType(tValue["curve"])]);
									tMaxTime=Math.max(tMaxTime,tValue.time);
								}
								break ;
							case "translate":
								for (j=0;j < tValues.length;j++){
									tValue=tValues[j];
									var x=(tValue.x || 0);
									var y=(tValue.y || 0);
									tBoneAniData.addData(tValue.time,"translate",[x,y,this.getCurveType(tValue["curve"])]);
									tMaxTime=Math.max(tMaxTime,tValue.time);
								}
								break ;
							case "scale":
								for (j=0;j < tValues.length;j++){
									tValue=tValues[j];
									var scaleX=(tValue.x || 0);
									var scaleY=(tValue.y || 0);
									tBoneAniData.addData(tValue.time,"scale",[scaleX,scaleY,this.getCurveType(tValue["curve"])]);
									tMaxTime=Math.max(tMaxTime,tValue.time);
								}
								break ;
							case "shear":
								for (j=0;j < tValues.length;j++){
									tValue=tValues[j];
									var scaleX=(tValue.x || 0);
									var scaleY=(tValue.y || 0);
									tBoneAniData.addData(tValue.time,"shear",[scaleX,scaleY,this.getCurveType(tValue["curve"])]);
									tMaxTime=Math.max(tMaxTime,tValue.time);
								}
								break ;
							}
					}
					tBoneAniDataNew.buildFrames();
					tBoneAniData=tBoneAniDataNew;
					var tTransList=[];
					for (j=0;j < tBoneAniData.mTransList.length;j++){
						tAnimBoneFrame=new DBAniBoneFrameData();
						tAnimBoneFrame.transform=tBoneAniData.mTransList[j];
						tAnimBoneFrame.time=tBoneAniData.mTimeList[j];
						tAniBone.frameArr.push(tAnimBoneFrame);
						tMaxTime=Math.max(tMaxTime,tAnimBoneFrame.time);
					}
					}else {
					tAnimBoneFrame=new DBAniBoneFrameData();
					tAnimBoneFrame.transform=new DBTransform();
					tAniBone.frameArr.push(tAnimBoneFrame);
				}
			};
			var slots=map.slots;
			var slotMap,slotIndex=0,slotName;
			var values;
			var valueMap;
			var frameIndex=0;
			var timelineName;
			var tDBAniSlotData;
			var tDBAniSlotFrameData;
			var tSlotAniData;
			var tSkinData=(this.mSkeletonData.mArmatureArr [0]).skinArr [0];
			var tDBSlotData;
			var tDisplayIndex=0;
			for (slotName in slots){
				tDBSlotData=tSkinData.getDBSlotData(slotName);
				slotMap=slots[slotName];
				slotIndex=this.mSkeletonData.findSlotIndex(slotName);
				tSlotAniData=new SlotAniData();
				for (timelineName in slotMap){
					values=slotMap[timelineName];
					if (timelineName=="color"){
						frameIndex=0;
						var $each_valueMap;
						for($each_valueMap in values){
							valueMap=values[$each_valueMap];
							var color=valueMap["color"];
							var r=SpineFactory.toColor(color,0);
							var g=SpineFactory.toColor(color,1);
							var b=SpineFactory.toColor(color,2);
							var a=SpineFactory.toColor(color,3);
							tSlotAniData.addData(valueMap.time,"color",[r,g,b,a]);
							frameIndex++;
						}
						}else if (timelineName=="attachment"){
						var $each_valueMap;
						for($each_valueMap in values){
							valueMap=values[$each_valueMap];
							tDisplayIndex=armature.getAttachNameIndex(valueMap.name);
							if (valueMap["isAdd"]){
								tDisplayIndex=-2;
								//debugger;
							}
							tSlotAniData.addData(valueMap.time,"attachment",[tDisplayIndex]);
						}
						}else {
						throw new Error("Invalid timeline type for a slot: "+timelineName+" ("+slotName+")");
					}
				}
				tDBAniSlotData=new DBAniSlotData();
				tDBAniSlotData.name=slotName;
				for (i=0;i < tSlotAniData.mDataList.length;i++){
					tDBAniSlotFrameData=tSlotAniData.mDataList[i];
					tDBAniSlotFrameData.time=tSlotAniData.mTimeList[i];
					tDBAniSlotData.frameArr.push(tDBAniSlotFrameData);
					tMaxTime=Math.max(tMaxTime,tDBAniSlotFrameData.time);
				}
				tAnimation.slotArr.push(tDBAniSlotData);
			};
			var ikMap=map.ik;
			var ikAniData;
			var mix=1;
			var bendDirection=-1;
			for (var ikConstraintName in ikMap){
				tValue=ikMap[ikConstraintName];
				ikAniData=new IkAniData();
				ikAniData.name=ikConstraintName;
				var $each_valueMap;
				for($each_valueMap in tValue){
					valueMap=tValue[$each_valueMap];
					mix=valueMap.hasOwnProperty("mix")? valueMap["mix"] :1;
					bendDirection=(!valueMap.hasOwnProperty("bendPositive")|| valueMap["bendPositive"])?1:-1;
					ikAniData.addData(valueMap.time,bendDirection,mix);
				}
				tMaxTime=Math.max(tMaxTime,ikAniData.mMaxTime);
				tAnimation.ikArr.push(ikAniData);
			};
			var rotateMix=NaN;
			var translateMix=NaN;
			var scaleMix=NaN;
			var paths=map.paths;
			for (var pathName in paths){
				var index=this.mSkeletonData.findPathConstraintIndex(pathName);
				if (index==-1)console.log("Path constraint not found: "+pathName);
				var data=this.mSkeletonData.pathConstraints[index];
				var pathMap=paths[pathName];
				for (timelineName in pathMap){
					values=pathMap[timelineName];
					var tPathAniData=new PathAniData();
					tPathAniData.pathName=pathName;
					tPathAniData.index=index;
					tPathAniData.type=timelineName;
					switch(timelineName){
						case "position":
						case "spacing":
							var $each_valueMap;
							for($each_valueMap in values){
								valueMap=values[$each_valueMap];
								var value=valueMap[timelineName] || 0;
								tPathAniData.addData(valueMap.time,[value]);
							}
							break ;
						case "mix":
							var $each_valueMap;
							for($each_valueMap in values){
								valueMap=values[$each_valueMap];
								rotateMix=valueMap.hasOwnProperty("rotateMix")?valueMap["rotateMix"] :1;
								translateMix=valueMap.hasOwnProperty("translateMix")?valueMap["translateMix"]:1;
								tPathAniData.addData(valueMap.time,[rotateMix,translateMix]);
							}
							break ;
						}
					tAnimation.pathArr.push(tPathAniData);
				}
			};
			var tDeformAniData;
			var deformMap=map.deform;
			for (var skinName in deformMap){
				var skin=this.mSkeletonData.findSkin(skinName);
				slotMap=deformMap[skinName];
				var tSkinAni=new DeformSkinAni();
				tSkinAni.name=skinName;
				for (slotName in slotMap){
					var tDeformSlotData=new DeformSlotData();
					tSkinAni.deformSlotArray.push(tDeformSlotData);
					slotIndex=this.mSkeletonData.findSlotIndex(slotName);
					var timelineMap=slotMap[slotName];
					for (var timelineName in timelineMap){
						var tDeformSlotDisplayData=new DeformSlotDisplayData();
						tDeformSlotData.mDisplayArray.push(tDeformSlotDisplayData);
						values=timelineMap[timelineName];
						var tVertexAttachment=skin.getAttachment(slotIndex,timelineName);
						if (tVertexAttachment==null)console.log("error:");
						var weighted=tVertexAttachment.bones !=null;
						var vertices=tVertexAttachment.vertices;
						var deformLength=weighted ? vertices.length / 3 *2:vertices.length;
						tDeformSlotDisplayData.slotIndex=slotIndex;
						tDeformSlotDisplayData.attachment=timelineName;
						frameIndex=0;
						var $each_valueMap;
						for($each_valueMap in values){
							valueMap=values[$each_valueMap];
							var deform;
							var verticesValue=valueMap["vertices"];
							if (verticesValue==null){
								if (weighted){
									deform=new Array(deformLength);
									for (i=0;i < deformLength;i++){
										deform[i]=0;
									}
									}else {
									deform=vertices;
								}
								}else {
								deform=new Array(deformLength);
								for (i=0;i < deformLength;i++){
									deform[i]=0;
								};
								var start=valueMap.offset || 0;
								var temp=this.getFloatArray(valueMap,"vertices",1);
								for (i=0;i < temp.length;i++){
									deform[start+i]=temp[i];
								}
								if (!weighted){
									for (i=0;i < deformLength;i++){
										deform[i]+=vertices[i];
									}
								}
							};
							var tKey=true;
							var tCurve=valueMap["curve"];
							if (tCurve && tCurve=="stepped"){
								tKey=false;
							}
							tDeformSlotDisplayData.addData(valueMap.time *1000,deform,tKey);
							frameIndex++;
						}
					}
				}
				tAnimation.deformSkinAniList.push(tSkinAni);
			};
			var drawOrderValues=map["drawOrder"];
			if (!drawOrderValues)drawOrderValues=map["draworder"];
			if (drawOrderValues){
				var tDrawOrderArr=tAnimation.drawOrderArr;
				var slotCount=this.mSkeletonData.slots.length;
				frameIndex=0;
				var drawOrderMap;
				for(var $each_drawOrderMap in drawOrderValues){
					drawOrderMap=drawOrderValues[$each_drawOrderMap];
					var drawOrder=__newvec(slotCount);
					var tDOAniData;
					if (drawOrderMap["offsets"]){
						for (i=0;i < slotCount;i++){
							drawOrder[i]=-1;
						};
						var offsets=drawOrderMap["offsets"];
						var unchanged=new Array(slotCount-offsets.length);
						var originalIndex=0;
						var unchangedIndex=0;
						var offsetMap;
						for(var $each_offsetMap in offsets){
							offsetMap=offsets[$each_offsetMap];
							slotIndex=this.mSkeletonData.findSlotIndex(offsetMap["slot"]);
							if (slotIndex==-1)console.log("Slot not found: "+offsetMap["slot"]);
							while (originalIndex !=slotIndex){
								unchanged[unchangedIndex++]=originalIndex++;
							}
							drawOrder[originalIndex+offsetMap["offset"]]=originalIndex++;
						}
						while (originalIndex < slotCount){
							unchanged[unchangedIndex++]=originalIndex++;
						}
						for (i=slotCount-1;i >=0;i--){
							if (drawOrder[i]==-1)drawOrder[i]=unchanged[--unchangedIndex];
						}
						tDOAniData=new DrawOrderAniData();
						tDOAniData.time=drawOrderMap["time"] *1000;
						tDOAniData.orderArr=drawOrder;
						tDrawOrderArr.push(tDOAniData);
						}else {
						for (i=0;i < slotCount;i++){
							drawOrder[i]=i;
						}
						tDOAniData=new DrawOrderAniData();
						tDOAniData.time=drawOrderMap["time"] *1000;
						tDOAniData.orderArr=drawOrder;
						tDrawOrderArr.push(tDOAniData);
					}
				}
			};
			var eventsMap=map["events"];
			if (eventsMap){
				var tEventArr=tAnimation.eventArr;
				var eventData;
				var tEventData;
				var eventMap;
				for(var $each_eventMap in eventsMap){
					eventMap=eventsMap[$each_eventMap];
					eventData=this.mSkeletonData.findEvent(eventMap["name"]);
					tEventData=new EventData();
					tEventData.name=eventData.name;
					tEventData.intValue=eventsMap.hasOwnProperty("int")?eventMap["int"]:eventData.intValue;
					tEventData.floatValue=eventMap.hasOwnProperty("float")?eventMap["float"]:eventData.floatValue;
					tEventData.stringValue=eventMap.hasOwnProperty("string")?eventMap["string"]:eventData.stringValue;
					tEventData.time=eventMap["time"] *1000;
					tEventArr.push(tEventData);
				}
			}
			tAnimation.duration=tMaxTime;
			var tAniBoneArr=tAnimation.boneArr;
			var tCurrTime=0;
			for (i=0;i < tAniBoneArr.length;i++){
				tAniBone=tAniBoneArr[i];
				if (tAniBone.frameArr.length > 0){
					tAnimBoneFrame=tAniBone.frameArr[0];
					if (tAnimBoneFrame.time > 0){
						tNextAniBoneFrame=new DBAniBoneFrameData();
						tNextAniBoneFrame.transform=new DBTransform();
						tNextAniBoneFrame.time=0;
						tAniBone.frameArr.unshift(tNextAniBoneFrame);
					}
					tAnimBoneFrame=tAniBone.frameArr[tAniBone.frameArr.length-1];
					if (tAnimBoneFrame.time < tMaxTime){
						tNextAniBoneFrame=tAnimBoneFrame.copy();
						tNextAniBoneFrame.time=tMaxTime;
						tAniBone.frameArr.push(tNextAniBoneFrame);
					}
					}else{
					tNextAniBoneFrame=new DBAniBoneFrameData();
					tNextAniBoneFrame.transform=new DBTransform();
					tNextAniBoneFrame.time=0;
					tAniBone.frameArr.unshift(tNextAniBoneFrame);
					tNextAniBoneFrame=new DBAniBoneFrameData();
					tNextAniBoneFrame.transform=new DBTransform();
					tNextAniBoneFrame.time=tMaxTime;
					tAniBone.frameArr.push(tNextAniBoneFrame);
				}
				for (j=0;j < tAniBone.frameArr.length-1;j++){
					tAnimBoneFrame=tAniBone.frameArr[j];
					tNextAniBoneFrame=tAniBone.frameArr[j+1];
					tAnimBoneFrame.duration=tNextAniBoneFrame.time-tAnimBoneFrame.time;
				}
				tAnimBoneFrame=tAniBone.frameArr[j];
				if (Math.abs(tMaxTime-tAnimBoneFrame.time)> 0.01){
					tAnimBoneFrame.duration=tMaxTime-tAnimBoneFrame.time;
					}else {
					tAnimBoneFrame.duration=0;
				}
				tAniBone.checkAngle();
			};
			var tAniSlotArr=tAnimation.slotArr;
			var tNextDBAniSlotFrameData;
			for (i=0;i < tAniSlotArr.length;i++){
				tDBAniSlotData=tAniSlotArr [i];
				if (tDBAniSlotData.frameArr.length > 0){
					tDBSlotData=tSkinData.getDBSlotData(tDBAniSlotData.name);
					if (tDBSlotData){
						tDisplayIndex=armature.getAttachNameIndex(tDBSlotData.defaultDisplayName);
						}else {
						tDisplayIndex=-1;
					}
					tDBAniSlotFrameData=tDBAniSlotData.frameArr[0];
					if (tDBAniSlotFrameData.time > 0){
						tNextDBAniSlotFrameData=new DBAniSlotFrameData();
						tNextDBAniSlotFrameData.displayIndex=tDisplayIndex;
						tNextDBAniSlotFrameData.aM=1;
						tNextDBAniSlotFrameData.time=0;
						tDBAniSlotData.frameArr.unshift(tNextDBAniSlotFrameData);
					}
					tDBAniSlotFrameData=tDBAniSlotData.frameArr[tDBAniSlotData.frameArr.length-1];
					if (tDBAniSlotFrameData.time < tMaxTime){
						tNextDBAniSlotFrameData=tDBAniSlotFrameData.copy();
						tNextDBAniSlotFrameData.time=tMaxTime;
						tDBAniSlotData.frameArr.push(tNextDBAniSlotFrameData);
					}
				}
				for (j=0;j < tDBAniSlotData.frameArr.length-1;j++){
					tDBAniSlotFrameData=tDBAniSlotData.frameArr[j];
					tNextDBAniSlotFrameData=tDBAniSlotData.frameArr[j+1];
					tDBAniSlotFrameData.duration=tNextDBAniSlotFrameData.time-tDBAniSlotFrameData.time;
				}
				tDBAniSlotFrameData=tDBAniSlotData.frameArr[j];
				tDBAniSlotFrameData.duration=tMaxTime-tDBAniSlotFrameData.time;
			};
			var tIkArr=tAnimation.ikArr;
			var tIkCD;
			var tSpineIkCD;
			var tNextSpineIkCD;
			for (i=0;i < tIkArr.length;i++){
				ikAniData=tIkArr [i];
				if (ikAniData.mDataList.length > 0){
					tIkCD=this.mSkeletonData.findIkConstraint(ikAniData.name);
					tSpineIkCD=ikAniData.mDataList [0];
					if (tSpineIkCD.time > 0){
						tNextSpineIkCD=new SpineIkConstraintData();
						tNextSpineIkCD.time=0;
						tNextSpineIkCD.bendDirection=tIkCD.bendDirection;
						tNextSpineIkCD.mix=tIkCD.mix;
						ikAniData.mDataList.unshift(tNextSpineIkCD);
					}
					tSpineIkCD=ikAniData.mDataList[ikAniData.mDataList.length-1];
					if (tSpineIkCD.time < tMaxTime){
						tNextSpineIkCD=tSpineIkCD.copy();
						tNextSpineIkCD.time=tMaxTime;
						ikAniData.mDataList.push(tNextSpineIkCD);
					}
				}
				for (j=0;j < ikAniData.mDataList.length-1;j++){
					tSpineIkCD=ikAniData.mDataList[j];
					tNextSpineIkCD=ikAniData.mDataList[j+1];
					tSpineIkCD.duration=tNextSpineIkCD.time-tSpineIkCD.time;
				}
				tSpineIkCD=ikAniData.mDataList[j];
				tSpineIkCD.duration=tMaxTime-tSpineIkCD.time;
			};
			var tPathArr=tAnimation.pathArr;
			var tPathCD;
			var tSpinePathCD;
			var tSpineNextPathCD;
			for (i=0;i < tPathArr.length;i++){
				tPathAniData=tPathArr [i];
				if (tPathAniData.mDataList.length > 0){
					tPathCD=this.mSkeletonData.pathConstraints[tPathAniData.index];
					tSpinePathCD=tPathAniData.mDataList [0];
					if (tSpinePathCD.time > 0){
						tSpineNextPathCD=tPathCD.copy();
						tSpineNextPathCD.time=0;
						tPathAniData.mDataList.unshift(tSpineNextPathCD);
					}
					tSpinePathCD=tPathAniData.mDataList[tPathAniData.mDataList.length-1];
					if (tSpinePathCD.time < tMaxTime){
						tSpineNextPathCD=tSpinePathCD.copy();
						tSpineNextPathCD.time=tMaxTime;
						tPathAniData.mDataList.push(tSpineNextPathCD);
					}
				}
				for (j=0;j < tPathAniData.mDataList.length-1;j++){
					tSpinePathCD=tPathAniData.mDataList[j];
					tSpineNextPathCD=tPathAniData.mDataList[j+1];
					tSpinePathCD.duration=tSpineNextPathCD.time-tSpinePathCD.time;
				}
				tSpinePathCD=tPathAniData.mDataList[j];
				tSpinePathCD.duration=tMaxTime-tSpinePathCD.time;
			}
		}

		SpineFactory.toColor=function(hexString,colorIndex){
			if (hexString.length !=8)console.log("Color hexidecimal length must be 8, recieved: "+hexString);
			return parseInt(hexString.substring(colorIndex *2,colorIndex *2+2),16)/ 255;
		}

		SpineFactory.FRAMELEN=8;
		return SpineFactory;
	})(Sprite)


	//class dragonBones.BoneAniToolsLive extends Tools
	var BoneAniToolsLive=(function(_super){
		function BoneAniToolsLive(){
			this.mTexturePath=null;
			this.mTextureJsonPath=null;
			this.mSkeletonJsonPath=null;
			this.mSaveAniPath=null;
			this.mSaveTexturePath=null;
			this.mTexture=null;
			this.mTextureJson=null;
			this.mSkeletonJson=null;
			this.versionPath="version4.5";
			this.DBFileName="man";
			this.mCompleteFun=null;
			this.mFailFun=null;
			this.mSpineFactory=null;
			this.mDBFactory=null;
			this.mDBTools=null;
			this.mNodePath=null;
			this.tExType=0;
			this.mTexturePathList=null;
			this.testCompleteFun=null;
			this.mInvoker=null;
			BoneAniToolsLive.__super.call(this);
			if (Laya.stage==null){
				Laya.init(1,1);
			}
		}

		__class(BoneAniToolsLive,'dragonBones.BoneAniToolsLive',_super);
		var __proto=BoneAniToolsLive.prototype;

		// Load spine exported files(json,atlas,png) and pass back the converted bytes buffer to the callback function.
		// Parameters:
		//   invokerThisObj: Invoker context object
		//   spineResDir:    Dir that contains the target spine resources.End without '/'
		//   spineFilename:  Filename of target spine resources (without extention name).
		//   completeFunc:   Callback function that would be called after spine resources converted in memory.(function signature:fn(bytesBuffer:ArrayBuffer))
		__proto.loadSpineFile = function(invokerThisObj, spineResDir, spineFilename, completeFunc){
			BoneAniToolsLive.mBoneToolsKey=true;
			BoneAniTools.mBoneToolsKey=true;    // To avoid debug bones texture shows up.Search "BoneAniTools.mBoneToolsKey" reference in class SpineFactory
			this.mFactoryType = 1;
			this.versionPath=spineResDir;
			this.mInvoker = invokerThisObj;
			this.testCompleteFun=completeFunc;

			var baseSpineFilePath = this.join(spineResDir, spineFilename);
			this.mTexturePath = baseSpineFilePath+".png";
			this.mTextureJsonPath = baseSpineFilePath+".atlas";
			this.mSkeletonJsonPath = baseSpineFilePath+".json";
			Laya.loader.load([
				{url: this.mTexturePath, type: "image"},
				{url: this.mTextureJsonPath, type: "text"},
				{url: this.mSkeletonJsonPath, type: "json"}
			], Handler.create(this, this.onLoaded), null, null, 1, true);
		}

		__proto.loadFile=function(nodePath,dbTools,path,outPath,completeFun,failFun,type,eType,tDBFileName){
			(type===void 0)&& (type=0);
			(eType===void 0)&& (eType=0);
			this.mNodePath=nodePath;
			this.mDBTools=dbTools;
			BoneAniToolsLive.mBoneToolsKey=true;
			this.mFactoryType=type;
			var fileName;
			this.DBFileName=tDBFileName||nodePath.basename(path).split(".")[0];
			this.versionPath=path;
			this.mCompleteFun=completeFun;
			this.mFailFun=failFun;
			Laya.loader.on("error",this,this.onError)
			this.tExType=eType;
			switch(type){
				case 0:
					if (eType==2){
						this.mTexturePath=nodePath.join(this.versionPath,this.DBFileName+"_tex.png");
						this.mTextureJsonPath=nodePath.join(this.versionPath,this.DBFileName+"_tex.json");
						this.mSkeletonJsonPath=nodePath.join(this.versionPath,this.DBFileName+"_ske.json");
					}else{
						this.mTexturePath=nodePath.join(this.versionPath,"texture.png");
						this.mTextureJsonPath=nodePath.join(this.versionPath,"texture.json");
						this.mSkeletonJsonPath=nodePath.join(this.versionPath,this.DBFileName+".json");
					}
					this.mSaveAniPath=nodePath.join(outPath,this.DBFileName+".sk");
					this.mSaveTexturePath=outPath;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
						{url:this.mTextureJsonPath,type:"json" },
						{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded),null,null,1,true);
					break ;
				case 1:
					this.mTexturePath=nodePath.join(this.versionPath,this.DBFileName+".png");
					this.mTextureJsonPath=nodePath.join(this.versionPath,this.DBFileName+".atlas");
					this.mSkeletonJsonPath=nodePath.join(this.versionPath,this.DBFileName+".json");
					this.mSaveAniPath=nodePath.join(outPath,this.DBFileName+".sk");
					this.mSaveTexturePath=outPath;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
						{url:this.mTextureJsonPath,type:"text" },
						{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded),null,null,1,true);
					break ;
			}
		}

		__proto.testLoaderFile=function(type,name,path,dbTools,completeFun,failFun){
			this.mDBTools=dbTools;
			this.mFactoryType=type;
			var fileName;
			this.DBFileName=name;
			this.versionPath=path;
			this.mCompleteFun=completeFun;
			this.mFailFun=failFun;
			Laya.loader.on("error",this,this.onError)
			switch(type){
				case 0:
					if (this.tExType==2){
						this.mTexturePath=this.versionPath+"/"+this.DBFileName+"_tex.png";
						this.mTextureJsonPath=this.versionPath+"/"+this.DBFileName+"_tex.json";
						this.mSkeletonJsonPath=this.versionPath+"/"+this.DBFileName+"_ske.json";
					}else{
						this.mTexturePath=this.versionPath+"/texture.png";
						this.mTextureJsonPath=this.versionPath+"/texture.json";
						this.mSkeletonJsonPath=this.versionPath+"/"+this.DBFileName+".json";
					}
					this.mSaveAniPath=this.versionPath+this.DBFileName;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
						{url:this.mTextureJsonPath,type:"json" },
						{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded));
					break ;
				case 1:
					this.mTexturePath=this.versionPath+"/"+this.DBFileName+".png";
					this.mTextureJsonPath=this.versionPath+"/"+this.DBFileName+".atlas";
					this.mSkeletonJsonPath=this.versionPath+"/"+this.DBFileName+".json";
					this.mSaveAniPath=this.versionPath+this.DBFileName;
					Laya.loader.load([{url:this.mTexturePath,type:"image" },
						{url:this.mTextureJsonPath,type:"text" },
						{url:this.mSkeletonJsonPath,type:"json" }],Handler.create(this,this.onLoaded));
					break ;
			}
		}

		__proto.onError=function(err){
			var tErrInfo="---"+this.DBFileName+"---"+"加载错误:"+err;
			console.warn(tErrInfo);
			this.clear();
		}

		__proto.onErrorVersion=function(ver){
			var msg;
			switch(this.mFactoryType){
				case 0:
					msg="DragonBone支持版本为:"+"4.5"+"~"+"5.1.0"+""+"当前文件版本为"+ver;
					break ;
				case 1:
					msg="Spine支持版本为:"+"3.4.0.2"+"~"+"3.6.16"+""+"当前文件版本为"+ver;
					break ;
			}
			msg+="\n动画结果可能不正确:"+this.mSkeletonJsonPath;
			console.log(msg);
		}

		__proto.onLoaded=function(){
			this.mTexture=Loader.getRes(this.mTexturePath);
			this.mTextureJson=Loader.getRes(this.mTextureJsonPath);
			this.mSkeletonJson=Loader.getRes(this.mSkeletonJsonPath);
			var tVer;
			tVer=this.getSkeletonVersion(this.mSkeletonJson,this.mFactoryType);
			if (!this.isSkeletonVersionOK(tVer,this.mFactoryType)){
				this.onErrorVersion(tVer);
			}
			switch(this.mFactoryType){
				case 0:
					this.loadComplete();
					break ;
				case 1:
					try {
						var tAtlas=new Atlas();
						this.mTexturePathList=tAtlas.preInit(this.mTextureJson);
						var tLoadList=[];
						var tObject;
						var tPath;
						for (var i=0;i < this.mTexturePathList.length;i++){
							tPath=this.join(this.versionPath,this.mTexturePathList[i]);
							tObject={url:tPath,type:"image" };
							tLoadList.push(tObject);
						}
						Laya.loader.load(tLoadList,Handler.create(this,this.loadComplete));
					}catch (e){
						this.onError("纹理头解析出错:"+e);
					}
					break ;
			}
		}

		__proto.getSkeletonVersion=function(dataO,type){
			var ver;
			var verNum=NaN;
			var isOk=false;
			switch(type){
				case 0:
					ver=dataO.version;
					verNum=BoneAniToolsLive.getVerNum(ver);
					isOk=verNum >=BoneAniToolsLive.MinDragonNum && verNum <=BoneAniToolsLive.MaxDragonNum;
					break ;
				case 1:
					ver=dataO.skeleton.spine;
					verNum=BoneAniToolsLive.getVerNum(ver);
					isOk=verNum >=BoneAniToolsLive.MinSpineNum && verNum <=BoneAniToolsLive.MaxSpineNum;
					break ;
			}
			console.log("skeletonVer:",ver,isOk);
			return ver;
		}

		__proto.isSkeletonVersionOK=function(ver,type){
			var isOk=false;
			var verNum=NaN;
			switch(type){
				case 0:
					verNum=BoneAniToolsLive.getVerNum(ver);
					isOk=verNum >=BoneAniToolsLive.MinDragonNum && verNum <=BoneAniToolsLive.MaxDragonNum;
					break ;
				case 1:
					verNum=BoneAniToolsLive.getVerNum(ver);
					isOk=verNum >=BoneAniToolsLive.MinSpineNum && verNum <=BoneAniToolsLive.MaxSpineNum;
					break ;
			}
			return isOk;
		}

		__proto.loadComplete=function(){
			var tTextureName;
			var i=0;
			try {
				switch(this.mFactoryType){
					case 0:
						this.mDBFactory=new LayaFactory()
						this.mDBFactory.on("complete",this,this.onCompleteHandler);
						this.mDBFactory.parseData(this.mTexture,this.mTextureJson,this.mSkeletonJson,this.DBFileName+".png");
						break ;
					case 1:
						this.mSpineFactory=new SpineFactory();
						this.mSpineFactory.on("complete",this,this.onCompleteHandler);
						var tTextureMap={};
						var tTexture;
						for (i=0;i < this.mTexturePathList.length;i++){
							tTextureName=this.mTexturePathList[i];
							tTexture=Loader.getRes(this.join(this.versionPath,tTextureName));
							tTextureMap[tTextureName]=tTexture;
						}
						this.mSpineFactory.parseData(tTextureMap,this.mTextureJson,this.mSkeletonJson);
						break ;
				}
			}catch (e){
				this.onError("解析文件出错:"+e);
			}
		}

		__proto.onCompleteHandler=function(){
			var testLayaAnimation=new TestLayaAnimation();
			var tLayaAni;
			var stringJSON;
			try {
				switch(this.mFactoryType){
					case 0:
						tLayaAni=testLayaAnimation.getLayaBoneAni(this.mDBFactory.mArmatureArr,this.mDBFactory.mDBTextureDataArray,"Dragon");
						break ;
					case 1:
						tLayaAni=testLayaAnimation.getLayaBoneAni(this.mSpineFactory.mSkeletonData.mArmatureArr,this.mSpineFactory.mDBTextureDataArray);
						break ;
				}
			}catch (e){
				this.onError("组织数据出错:"+e);
			}
			try {
				var buffer=this.getObjectBuffer(tLayaAni);
			}catch (e){
				this.onError("导出二进制数据出错:"+e);
			}
			if (this.testCompleteFun != null) {
				this.testCompleteFun.call(this.mInvoker, buffer);
			}
		}

		//保存文件
		__proto.save=function(filename,dataView){
			var tTextureList=[];
			var tTextureOutList=[];
			try {
				if (BoneAniToolsLive.mBoneToolsKey){
					var tTextureName;
					switch(this.mFactoryType){
						case 0:
							if (this.tExType==2){
								tTextureList.push(this.join(this.versionPath,this.DBFileName+"_tex.png"));
							}else{
								tTextureList.push(this.join(this.versionPath,"texture.png"));
							}
							tTextureOutList.push(this.join(this.mSaveTexturePath,this.DBFileName+".png"));
							break ;
						case 1:
							for (var i=0;i < this.mTexturePathList.length;i++){
								tTextureName=this.mTexturePathList[i];
								tTextureList.push(this.join(this.versionPath,tTextureName));
								tTextureOutList.push(this.join(this.mSaveTexturePath,tTextureName));
							}
							break ;
					}
				}
			}catch (e){
				this.onError("清除loader资源出错:"+e);
			}
			this.mCompleteFun.call(this.mDBTools,filename,dataView,tTextureList,tTextureOutList);
		}

		__proto.clear=function(){
			try {
				if (BoneAniToolsLive.mBoneToolsKey){
					Loader.clearRes(this.mTexturePath);
					Loader.clearRes(this.mTextureJsonPath);
					Loader.clearRes(this.mSkeletonJsonPath);
					var tTextureName;
					if (this.mTexturePathList){
						switch(this.mFactoryType){
							case 1:
								for (var i=0;i < this.mTexturePathList.length;i++){
									tTextureName=this.mTexturePathList[i];
									Loader.clearRes(this.join(this.versionPath,tTextureName));
								}
								break ;
						}
						this.mTexturePathList.length=0;
					}
				}
			}catch (e){
				this.onError("清除loader资源出错:"+e);
			}
		}

		__proto.join=function(str1,str2){
			var tOut;
			if (this.mNodePath){
				tOut=this.mNodePath.join(str1,str2);
			}else {
				tOut=str1+"/"+str2;
			}
			return tOut;
		}

		__getset(1,BoneAniToolsLive,'SpineTip',function(){
			return BoneAniToolsLive.getVersionTip("3.4.0.2","3.6.16");
		},Tools._$SET_SpineTip);

		__getset(1,BoneAniToolsLive,'DragonBoneTip',function(){
			return BoneAniToolsLive.getVersionTip("4.5","5.1.0");
		},Tools._$SET_DragonBoneTip);

		BoneAniToolsLive.getVersionTip=function(min,max){
			return "("+min+"~"+max+")";
		}

		BoneAniToolsLive.getVerNum=function(ver){
			var nums;
			nums=ver.split(".");
			var i=0,len=0;
			len=nums.length;
			var rst=NaN;
			rst=0;
			var tWeight=NaN;
			tWeight=1;
			var tValue=NaN;
			for (i=0;i < len;i++){
				tValue=parseInt(nums[i]);
				if (isNaN(tValue)){
					tValue=0;
				}
				rst+=tValue *tWeight;
				tWeight *=0.01;
			}
			return rst;
		}

		BoneAniToolsLive.mBoneToolsKey=false;
		BoneAniToolsLive.MinSpine="3.4.0.2";
		BoneAniToolsLive.MaxSpine="3.6.16";
		BoneAniToolsLive.MinDragon="4.5";
		BoneAniToolsLive.MaxDragon="5.1.0";
		__static(BoneAniToolsLive,
		['MinSpineNum',function(){return this.MinSpineNum=BoneAniTools.getVerNum("3.4.0.2");},'MaxSpineNum',function(){return this.MaxSpineNum=BoneAniTools.getVerNum("3.6.16");},'MinDragonNum',function(){return this.MinDragonNum=BoneAniTools.getVerNum("4.5");},'MaxDragonNum',function(){return this.MaxDragonNum=BoneAniTools.getVerNum("5.1.0");}
		]);
		return BoneAniToolsLive;
	})(Tools)


	//class laya.ani.bone.SpineAnimationTemplet extends laya.ani.bone.Templet
	var SpineAnimationTemplet = (function (_super) {
		function SpineAnimationTemplet() {
			SpineAnimationTemplet.__super.call(this);
		}

		__class(SpineAnimationTemplet, 'laya.ani.bone.SpineAnimationTemplet', _super);
		var __proto = SpineAnimationTemplet.prototype;

		__proto.loadSpineAni = function (spineResDir, spineFilename) {
			if (spineResDir[spineResDir.length - 1] == "/")
				spineResDir = spineResDir.slice(0, spineResDir.length - 1);

			this._path = spineResDir + "/";
			var tools = new dragonBones.BoneAniToolsLive();
			tools.loadSpineFile(this, spineResDir, spineFilename, function (tSkBuffer) {
				// console.log(tSkBuffer);
				this.parseData(null, tSkBuffer);
			});
		}

		return SpineAnimationTemplet;
	})(laya.ani.bone.Templet)


	Laya.__init([DBAnimationData]);
})(window,document,Laya);
